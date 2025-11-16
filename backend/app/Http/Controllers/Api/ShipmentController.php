<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\UserHelper;
use App\Models\Shipment;
use App\Models\Transport;
use App\Models\Order;
use App\Models\Invoice;
use App\Events\ShipmentStatusUpdated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class ShipmentController extends Controller
{
    public function index(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $status = $request->query('status');
        $search = $request->query('q');
        $limit = (int) ($request->query('limit', 20));
        $limit = max(1, min($limit, 100));

        // Get all shipments with transport and driver info
        // Group by tracking_id to avoid duplicates (multiple packages share the same tracking_id)
        // Query shipments with joined data
        $query = DB::table('shipments as sg')
            ->leftJoin('transport as t', 'sg.transport_id', '=', 't.transport_id')
            ->leftJoin('users as d', 'sg.driver_id', '=', 'd.user_id')
            ->leftJoin('budgets as b', 'sg.budget_id', '=', 'b.budget_id')
            ->leftJoin('warehouse as w', 'sg.warehouse_id', '=', 'w.warehouse_id')
            ->leftJoin(DB::raw('(SELECT shipment_id, MAX(tracking_history_id) as latest_id FROM tracking_history GROUP BY shipment_id) as latest_th'), 'sg.shipment_id', '=', 'latest_th.shipment_id')
            ->leftJoin('tracking_history as th', 'latest_th.latest_id', '=', 'th.tracking_history_id')
            ->whereExists(function ($query) use ($orgUserId) {
                $query->select(DB::raw(1))
                    ->from('shipment_details as sp')
                    ->join('orders as o', 'sp.order_id', '=', 'o.order_id')
                    ->whereColumn('sp.shipment_id', 'sg.shipment_id')
                    ->where('o.organization_id', $orgUserId);
            })
            ->select(
                'sg.shipment_id',
                'sg.status',
                'sg.creation_date',
                'sg.departure_date',
                'w.warehouse_name as origin_name',
                'd.username as driver_name',
                'd.email as driver_email',
                't.registration_number as vehicle_registration',
                't.vehicle_type',
                't.capacity as vehicle_capacity',
                't.volume_capacity as vehicle_volume_capacity',
                'b.budget_name',
                'b.total_budget',
                'th.timestamp as last_update',
                'th.location as current_location',
                'th.details as last_update_details'
            )
            ->orderByDesc('sg.creation_date');

        if ($status && $status !== 'any') {
            $query->where('sg.status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('sg.shipment_id', 'like', "%$search%")
                  ->orWhere('d.username', 'like', "%$search%")
                  ->orWhere('t.registration_number', 'like', "%$search%");
            });
        }

        $shipments = $query->limit($limit)->get();

        // For each shipment, get all associated packages and calculate totals
        $data = $shipments->map(function ($shipment) use ($orgUserId) {
            // Get all packages for this shipment group
            $orders = DB::table('shipment_details as sp')
                ->join('orders as o', 'sp.order_id', '=', 'o.order_id')
                ->leftJoin('quotes as q', 'o.quote_id', '=', 'q.quote_id')
                ->where('sp.shipment_id', $shipment->shipment_id)
                ->where('o.organization_id', $orgUserId)
                ->select('o.order_id', 'o.order_number', 'o.package_type', 'q.weight', 'q.dimensions')
                ->get();

            // Calculate total weight and volume
            $totalWeight = 0;
            $totalVolume = 0;
            $packageCount = $orders->count();

            foreach ($orders as $order) {
                $totalWeight += floatval($order->weight ?? 0);

                // Calculate volume from dimensions
                if ($order->dimensions) {
                    try {
                        // Try JSON format first (e.g., {"L":30,"W":30,"H":30})
                        $dims = json_decode($order->dimensions);
                        if ($dims && isset($dims->L) && isset($dims->W) && isset($dims->H)) {
                            $volume = ($dims->L * $dims->W * $dims->H) / 1000000; // cm³ to m³
                            $totalVolume += $volume;
                        } else {
                            // Try string format (e.g., "32x32x32cm" or "32×32×32cm")
                            $dimStr = str_replace(['×', 'cm', ' '], ['x', '', ''], $order->dimensions);
                            $parts = explode('x', $dimStr);
                            if (count($parts) === 3) {
                                $l = floatval($parts[0]);
                                $w = floatval($parts[1]);
                                $h = floatval($parts[2]);
                                if ($l > 0 && $w > 0 && $h > 0) {
                                    $volume = ($l * $w * $h) / 1000000; // cm³ to m³
                                    $totalVolume += $volume;
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        // Skip if can't parse dimensions
                    }
                }
            }

            return [
                'id' => $shipment->shipment_id, // Now a string like "SHP-847293"
                'shipment_number' => $shipment->shipment_id, // Same as id
                'status' => $shipment->status,
                'driver_name' => $shipment->driver_name ?? 'N/A',
                'driver_email' => $shipment->driver_email,
                'vehicle_registration' => $shipment->vehicle_registration ?? 'N/A',
                'vehicle_type' => $shipment->vehicle_type ?? 'N/A',
                'vehicle_capacity' => floatval($shipment->vehicle_capacity ?? 0),
                'vehicle_volume_capacity' => floatval($shipment->vehicle_volume_capacity ?? 0),
                'budget_name' => $shipment->budget_name,
                'budget_amount' => $shipment->total_budget ? number_format($shipment->total_budget, 2) : null,
                'package_count' => $packageCount,
                'total_weight' => round($totalWeight, 2),
                'total_volume' => round($totalVolume, 2),
                'creation_date' => $shipment->creation_date,
                'departure_date' => $shipment->departure_date,
                'origin_name' => $shipment->origin_name,
                'last_update' => $shipment->last_update,
                'current_location' => $shipment->current_location,
                'last_update_details' => $shipment->last_update_details,
            ];
        });

        return response()->json([
            'data' => $data,
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function show($id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);

        // Get shipment group with all related data
        $shipmentGroup = DB::table('shipments as sg')
            ->leftJoin('transport as t', 'sg.transport_id', '=', 't.transport_id')
            ->leftJoin('users as d', 'sg.driver_id', '=', 'd.user_id')
            ->leftJoin('budgets as b', 'sg.budget_id', '=', 'b.budget_id')
            ->leftJoin('warehouse as w', 'sg.warehouse_id', '=', 'w.warehouse_id')
            ->where('sg.shipment_id', $id)
            ->whereExists(function ($query) use ($orgUserId) {
                $query->select(DB::raw(1))
                    ->from('shipment_details as sp')
                    ->join('orders as o', 'sp.order_id', '=', 'o.order_id')
                    ->whereColumn('sp.shipment_id', 'sg.shipment_id')
                    ->where('o.organization_id', $orgUserId);
            })
            ->select(
                'sg.*',
                'd.username as driver',
                't.registration_number',
                't.vehicle_type',
                't.capacity as vehicle_capacity',
                't.volume_capacity as vehicle_volume_capacity',
                'b.budget_name',
                'b.total_budget',
                'w.warehouse_name as origin_name',
                'w.location as origin_address'
            )
            ->first();

        if (!$shipmentGroup) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Get all packages for this shipment group
        $packages = DB::table('shipment_details as sp')
            ->join('orders as o', 'sp.order_id', '=', 'o.order_id')
            ->leftJoin('quotes as q', 'o.quote_id', '=', 'q.quote_id')
            ->leftJoin('inventory as inv', 'o.order_id', '=', 'inv.order_id')
            ->leftJoin('warehouse as w', 'inv.warehouse_id', '=', 'w.warehouse_id')
            ->where('sp.shipment_id', $id)
            ->where('o.organization_id', $orgUserId)
            ->select(
                'sp.tracking_id',
                'o.order_id',
                'o.order_number',
                'o.customer_name',
                'o.package_type',
                'o.receiver_name',
                'o.receiver_contact',
                'o.receiver_address',
                'q.estimated_cost',
                'q.weight',
                'q.dimensions',
                'q.delivery_zone',
                'w.warehouse_name',
                'w.location as warehouse_location',
                'inv.location_in_warehouse'
            )
            ->get();

        // Calculate total weight and volume
        $totalWeight = 0;
        $totalVolume = 0;
        $packagesData = $packages->map(function ($pkg) use (&$totalWeight, &$totalVolume) {
            $weight = floatval($pkg->weight ?? 0);
            $totalWeight += $weight;

            // Calculate volume from dimensions
            $volume = 0;
            if ($pkg->dimensions) {
                try {
                    // Try JSON format first (e.g., {"L":30,"W":30,"H":30})
                    $dims = json_decode($pkg->dimensions);
                    if ($dims && isset($dims->L) && isset($dims->W) && isset($dims->H)) {
                        $volume = ($dims->L * $dims->W * $dims->H) / 1000000; // cm³ to m³
                        $totalVolume += $volume;
                    } else {
                        // Try string format (e.g., "32x32x32cm" or "32×32×32cm")
                        $dimStr = str_replace(['×', 'cm', ' '], ['x', '', ''], $pkg->dimensions);
                        $parts = explode('x', $dimStr);
                        if (count($parts) === 3) {
                            $l = floatval($parts[0]);
                            $w = floatval($parts[1]);
                            $h = floatval($parts[2]);
                            if ($l > 0 && $w > 0 && $h > 0) {
                                $volume = ($l * $w * $h) / 1000000; // cm³ to m³
                                $totalVolume += $volume;
                            }
                        }
                    }
                } catch (\Exception $e) {
                    // Skip if can't parse dimensions
                }
            }

            return [
                'tracking_id' => $pkg->tracking_id,
                'order_id' => (int) $pkg->order_id,
                'order_number' => $pkg->order_number,
                'customer_name' => $pkg->customer_name,
                'package_type' => $pkg->package_type,
                'receiver_name' => $pkg->receiver_name,
                'receiver_contact' => $pkg->receiver_contact,
                'receiver_address' => $pkg->receiver_address,
                'actual_price' => $pkg->estimated_cost ? number_format($pkg->estimated_cost / 100, 2) : null,
                'weight' => round($weight, 2),
                'volume' => round($volume, 2),
                'dimensions' => $pkg->dimensions,
                'delivery_zone' => $pkg->delivery_zone,
                'warehouse_name' => $pkg->warehouse_name,
                'warehouse_location' => $pkg->warehouse_location,
                'storage_location' => $pkg->location_in_warehouse,
            ];
        });

        // Get master-level tracking history (shipment-level events without tracking_id)
        $masterTracking = DB::table('tracking_history')
            ->where('shipment_id', $id)
            ->whereNull('tracking_id')
            ->orderByDesc('timestamp')
            ->get();

        // Get package-level tracking history for each package
        $packageTracking = [];
        foreach ($packages as $pkg) {
            $packageHistory = DB::table('tracking_history')
                ->where('tracking_id', $pkg->tracking_id)
                ->orderByDesc('timestamp')
                ->get()
                ->map(function($item) {
                    return [
                        'id' => (int) $item->tracking_history_id,
                        'timestamp' => $item->timestamp,
                        'location' => $item->location,
                        'status' => $item->status,
                        'details' => $item->details,
                    ];
                });

            $packageTracking[$pkg->tracking_id] = $packageHistory;
        }

        // Get first package for receiver info (all packages have same receiver from same order)
        $firstPackage = $packages->first();

        $data = [
            'id' => $shipmentGroup->shipment_id, // String like "SHP-847293"
            'tracking_id' => $shipmentGroup->shipment_id,
            'shipment_number' => $shipmentGroup->shipment_id,
            'receiver_name' => $firstPackage->receiver_name ?? 'N/A',
            'receiver_contact' => $firstPackage->receiver_contact ?? 'N/A',
            'receiver_address' => $firstPackage->receiver_address ?? 'N/A',
            'receiver_email' => $firstPackage->receiver_email ?? null,
            'origin_name' => $shipmentGroup->origin_name ?? 'N/A',
            'origin_address' => $shipmentGroup->origin_address ?? 'N/A',
            'destination_name' => $firstPackage->receiver_name ?? 'N/A',
            'destination_address' => $firstPackage->receiver_address ?? 'N/A',
            'charges' => 0,
            'status' => $shipmentGroup->status,
            'creation_date' => $shipmentGroup->creation_date,
            'departure_date' => $shipmentGroup->departure_date,
            'customer' => $firstPackage->customer_name ?? 'N/A',
            'driver' => $shipmentGroup->driver ?? 'N/A',
            'driver_id' => $shipmentGroup->driver_id ? (int) $shipmentGroup->driver_id : null,
            'vehicle' => $shipmentGroup->registration_number ?? 'N/A',
            'vehicle_type' => $shipmentGroup->vehicle_type ?? 'N/A',
            'vehicle_capacity' => floatval($shipmentGroup->vehicle_capacity ?? 0),
            'vehicle_volume_capacity' => floatval($shipmentGroup->vehicle_volume_capacity ?? 0),
            'budget_id' => $shipmentGroup->budget_id ? (int) $shipmentGroup->budget_id : null,
            'budget_name' => $shipmentGroup->budget_name,
            'total_budget' => $shipmentGroup->total_budget,
            'package_count' => $packages->count(),
            'total_weight' => round($totalWeight, 2),
            'total_volume' => round($totalVolume, 2),
            'packages' => $packagesData,
            'master_tracking' => $masterTracking->map(function($item) {
                return [
                    'id' => (int) $item->tracking_history_id,
                    'timestamp' => $item->timestamp,
                    'location' => $item->location,
                    'status' => $item->status,
                    'details' => $item->details,
                ];
            }),
            'package_tracking' => $packageTracking,
            // Keep old tracking_history for backward compatibility
            'tracking_history' => $masterTracking->map(function($item) {
                return [
                    'id' => (int) $item->tracking_history_id,
                    'timestamp' => $item->timestamp,
                    'location' => $item->location,
                    'status' => $item->status,
                    'details' => $item->details,
                ];
            }),
        ];

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function createBatchShipment(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $data = $request->all();
        $validator = Validator::make($data, [
            'order_ids' => 'required|array|min:1',
            'order_ids.*' => 'required|integer|exists:orders,order_id',
            'transport_id' => 'required|integer|exists:transport,transport_id',
            'driver_id' => 'nullable|integer|exists:users,user_id',
            'budget_id' => 'nullable|integer',
            'departure_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Generate shipment ID with format SHP-XXXXXX
        $shipmentId = 'SHP-' . str_pad(rand(100000, 999999), 6, '0', STR_PAD_LEFT);

        // Ensure unique shipment_id
        while (DB::table('shipments')->where('shipment_id', $shipmentId)->exists()) {
            $shipmentId = 'SHP-' . str_pad(rand(100000, 999999), 6, '0', STR_PAD_LEFT);
        }

        // Get warehouse_id from first order's inventory
        $firstOrder = DB::table('orders as o')
            ->leftJoin('inventory as inv', 'o.order_id', '=', 'inv.order_id')
            ->leftJoin('warehouse as w', 'inv.warehouse_id', '=', 'w.warehouse_id')
            ->where('o.order_id', $data['order_ids'][0])
            ->where('o.organization_id', $orgUserId)
            ->select('inv.warehouse_id', 'w.warehouse_name')
            ->first();

        // Create shipment group (ONE record for all packages)
        DB::table('shipments')->insert([
            'shipment_id' => $shipmentId,
            'transport_id' => $data['transport_id'],
            'driver_id' => $data['driver_id'] ?? null,
            'budget_id' => $data['budget_id'] ?? null,
            'warehouse_id' => $firstOrder->warehouse_id ?? null,
            'organization_id' => $orgUserId,
            'origin_name' => $firstOrder->warehouse_name ?? 'Warehouse',
            'origin_address' => $firstOrder->warehouse_name ?? 'N/A',
            'status' => 'pending',
            'departure_date' => $data['departure_date'] ?? null,
            'creation_date' => now(),
        ]);

        // Create tracking history entry for the shipment group
        DB::table('tracking_history')->insert([
            'shipment_id' => $shipmentId,
            'location' => $firstOrder->warehouse_name ?? 'Warehouse',
            'status' => 'pending',
            'details' => 'Shipment created',
            'timestamp' => now(),
        ]);

        $createdPackages = [];
        $emailsSent = [];
        $emailsFailed = [];

        // Now create packages for each order
        foreach ($data['order_ids'] as $orderId) {
            // Get order with receiver information
            $order = DB::table('orders as o')
                ->leftJoin('quotes as q', 'o.quote_id', '=', 'q.quote_id')
                ->where('o.order_id', $orderId)
                ->where('o.organization_id', $orgUserId)
                ->select('o.*', 'q.estimated_cost')
                ->first();

            if (!$order || $order->order_status !== 'fulfilled') {
                continue; // Skip invalid orders
            }

            // Check if package already exists
            $existingPackage = DB::table('shipment_details')->where('order_id', $orderId)->exists();
            if ($existingPackage) {
                continue; // Skip already shipped orders
            }

            // Generate unique tracking number for this customer
            $trackingNumber = $this->generateUniqueTrackingNumber();

            // Insert package into shipment_details
            DB::table('shipment_details')->insert([
                'tracking_id' => $trackingNumber,
                'shipment_id' => $shipmentId,
                'order_id' => $orderId,
                'receiver_name' => $order->receiver_name ?? 'N/A',
                'receiver_contact' => $order->receiver_contact ?? '',
                'receiver_email' => $order->receiver_email ?? '',
                'receiver_address' => $order->receiver_address ?? '',
                'receiver_lat' => $order->receiver_lat ?? null,
                'receiver_lng' => $order->receiver_lng ?? null,
                'charges' => 0,
                'status' => 'pending',
                'created_at' => now(),
            ]);

            $createdPackages[] = [
                'tracking_id' => $trackingNumber,
                'order_id' => $orderId,
                'customer' => $order->customer_name,
                'receiver' => $order->receiver_name,
            ];

            // Send email notification
            if (!empty($order->receiver_email)) {
                try {
                    // Convert estimated_cost from cents to pesos (divide by 100)
                    $shippingCost = isset($order->estimated_cost) ? ($order->estimated_cost / 100) : 0;

                    $this->sendShipmentNotificationEmail(
                        $order->receiver_email,
                        $order->customer_name,
                        $order->receiver_name,
                        $trackingNumber,
                        $order->receiver_name,
                        $order->receiver_address,
                        $shippingCost,
                        $data['departure_date'] ?? null
                    );
                    $emailsSent[] = $order->receiver_email;
                } catch (\Exception $e) {
                    \Log::error('Failed to send tracking email: ' . $e->getMessage());
                    $emailsFailed[] = $order->receiver_email;
                }
            }
        }

        return response()->json([
            'message' => count($createdPackages) . ' package(s) created successfully',
            'shipment_id' => $shipmentId,
            'packages' => $createdPackages,
            'emails_sent' => count($emailsSent),
            'emails_failed' => count($emailsFailed),
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }

    public function createFromOrder(Request $request, int $orderId)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $data = $request->all();
        $validator = Validator::make($data, [
            'transport_id' => 'required|integer|exists:transport,transport_id',
            'driver_id' => 'nullable|integer|exists:users,user_id',
            'budget_id' => 'nullable|integer',
            'departure_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Get order with receiver information and warehouse details
        $order = DB::table('orders as o')
            ->leftJoin('quotes as q', 'o.quote_id', '=', 'q.quote_id')
            ->leftJoin('inventory as inv', 'o.order_id', '=', 'inv.order_id')
            ->leftJoin('warehouse as w', 'inv.warehouse_id', '=', 'w.warehouse_id')
            ->where('o.order_id', $orderId)
            ->where('o.organization_id', $orgUserId)
            ->select(
                'o.*',
                'q.delivery_zone',
                'q.weight',
                'w.warehouse_name',
                'w.location as warehouse_address',
                'inv.warehouse_id',
                'inv.location_in_warehouse'
            )
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        if ($order->order_status !== 'fulfilled') {
            return response()->json(['message' => 'Order must be fulfilled before creating shipment'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Validate that order has receiver information
        if (!$order->receiver_name || !$order->receiver_contact || !$order->receiver_address) {
            return response()->json(['message' => 'Order is missing receiver information. Please update the order with receiver details first.'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Check if order already has a package in any shipment
        $existingPackage = DB::table('shipment_details')->where('order_id', $orderId)->exists();
        if ($existingPackage) {
            return response()->json(['message' => 'Shipment already exists for this order'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Generate master tracking number for grouping (internal use)
        $masterTrackingNumber = $this->generateTrackingNumber();

        // Generate unique tracking number for this customer's package
        $trackingNumber = $this->generateUniqueTrackingNumber();

        // Use order's receiver information and warehouse details
        $originName = $order->warehouse_name ?? 'Main Warehouse';
        $destinationName = $order->receiver_name;
        $destinationAddress = $order->receiver_address;

        // Calculate charges based on weight and delivery zone if not provided
        $charges = 0; // Default for now, can be calculated based on business logic

        // Create shipment group for single-order shipment
        $shipmentGroupId = $masterTrackingNumber;
        DB::table('shipments')->insert([
            'shipment_id' => $shipmentGroupId,
            'transport_id' => $data['transport_id'],
            'driver_id' => $data['driver_id'] ?? null,
            'budget_id' => $data['budget_id'] ?? null,
            'warehouse_id' => $order->warehouse_id ?? null,
            'organization_id' => $orgUserId,
            'origin_name' => $order->warehouse_name ?? 'Warehouse',
            'origin_address' => $order->warehouse_address ?? 'N/A',
            'creation_date' => now(),
            'status' => 'pending',
            'departure_date' => $data['departure_date'] ?? null,
        ]);

        // Create package for this order
        DB::table('shipment_details')->insert([
            'shipment_id' => $shipmentGroupId,
            'order_id' => $orderId,
            'tracking_id' => $trackingNumber,
            'receiver_name' => $order->receiver_name ?? 'N/A',
            'receiver_contact' => $order->receiver_contact ?? '',
            'receiver_email' => $order->receiver_email ?? '',
            'receiver_address' => $order->receiver_address ?? '',
            'receiver_lat' => $order->receiver_lat ?? null,
            'receiver_lng' => $order->receiver_lng ?? null,
            'charges' => $charges,
            'status' => 'pending',
            'created_at' => now(),
        ]);

        // Create tracking history for the shipment
        DB::table('tracking_history')->insert([
            'shipment_id' => $shipmentGroupId,
            'location' => $originName,
            'status' => 'pending',
            'details' => 'Shipment created',
            'timestamp' => now(),
        ]);

        // Send tracking email if receiver email is provided
        if (!empty($order->receiver_email)) {
            try {
                $this->sendShipmentNotificationEmail(
                    $order->receiver_email,
                    $order->receiver_name,
                    $trackingNumber,
                    $destinationName,
                    $destinationAddress,
                    $charges,
                    $data['departure_date'] ?? null
                );
            } catch (\Exception $e) {
                // Log error but don't fail the shipment creation
                \Log::error('Failed to send tracking email: ' . $e->getMessage());
            }
        }

        // Send SMS notification if receiver contact is provided
        if (!empty($data['receiver_contact'])) {
            try {
                \Log::info('Attempting to send SMS', [
                    'receiver_contact' => $data['receiver_contact'],
                    'receiver_name' => $data['receiver_name'],
                    'tracking_id' => $trackingNumber
                ]);

                $smsMessage = "Hello {$data['receiver_name']}! Your shipment #{$trackingNumber} is ready for dispatch to {$data['receiver_address']}. Track at logisync.com -LogiSync";

                $smsSent = $this->sendSMS($data['receiver_contact'], $smsMessage);

                if ($smsSent) {
                    \Log::info('SMS sent successfully to ' . $data['receiver_contact']);
                } else {
                    \Log::warning('SMS sending returned false for ' . $data['receiver_contact']);
                }
            } catch (\Exception $e) {
                // Log error but don't fail the shipment creation
                \Log::error('Failed to send SMS notification: ' . $e->getMessage());
            }
        } else {
            \Log::info('No receiver contact provided, skipping SMS notification');
        }

        return response()->json([
            'message' => 'Shipment created successfully',
            'shipment_id' => $shipmentGroupId,
            'tracking_id' => $trackingNumber,
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }

    public function updateStatus(Request $request, $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $data = $request->all();
        $validator = Validator::make($data, [
            'status' => 'required|string|in:pending,in_transit,out_for_delivery,delivered,cancelled',
            'location' => 'required|string|max:255',
            'details' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Verify shipment group belongs to user
        $shipmentGroup = DB::table('shipments as sg')
            ->whereExists(function ($query) use ($orgUserId) {
                $query->select(DB::raw(1))
                    ->from('shipment_details as sp')
                    ->join('orders as o', 'sp.order_id', '=', 'o.order_id')
                    ->whereColumn('sp.shipment_id', 'sg.shipment_id')
                    ->where('o.organization_id', $orgUserId);
            })
            ->where('sg.shipment_id', $id)
            ->first();

        if (!$shipmentGroup) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Store old status for event
        $oldStatus = $shipmentGroup->status;
        $newStatus = $data['status'];

        DB::table('shipments')->where('shipment_id', $id)->update([
            'status' => $newStatus,
        ]);

        DB::table('tracking_history')->insert([
            'shipment_id' => $id,
            'location' => $data['location'],
            'status' => $newStatus,
            'details' => $data['details'] ?? null,
        ]);

        // Auto-generate invoice when shipment is delivered
        if ($newStatus === 'delivered') {
            $this->createInvoiceForDeliveredShipment($id);
        }

        // Broadcast real-time status update
        $shipmentModel = Shipment::find($id);
        if ($shipmentModel) {
            event(new ShipmentStatusUpdated($shipmentModel, $oldStatus, $newStatus, 'admin'));
        }

        return response()->json(['message' => 'Shipment status updated'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function update(Request $request, $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $data = $request->all();
        $validator = Validator::make($data, [
            'driver_id' => 'nullable|integer|exists:users,user_id',
            'transport_id' => 'nullable|integer|exists:transport,transport_id',
            'budget_id' => 'nullable|integer|exists:budgets,budget_id',
            'departure_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Verify shipment group belongs to user
        $shipmentGroup = DB::table('shipments as sg')
            ->whereExists(function ($query) use ($orgUserId) {
                $query->select(DB::raw(1))
                    ->from('shipment_details as sp')
                    ->join('orders as o', 'sp.order_id', '=', 'o.order_id')
                    ->whereColumn('sp.shipment_id', 'sg.shipment_id')
                    ->where('o.organization_id', $orgUserId);
            })
            ->where('sg.shipment_id', $id)
            ->first();

        if (!$shipmentGroup) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Build update array with only provided fields
        $updateData = [];
        if (isset($data['driver_id'])) {
            // Verify driver belongs to organization
            if ($data['driver_id']) {
                $driver = DB::table('users')
                    ->where('user_id', $data['driver_id'])
                    ->where('organization_id', $orgUserId)
                    ->where('role', 'driver')
                    ->first();
                if (!$driver) {
                    return response()->json(['message' => 'Driver not found or not authorized'], 404)
                        ->header('Access-Control-Allow-Origin', '*');
                }
            }
            $updateData['driver_id'] = $data['driver_id'];
        }
        if (isset($data['transport_id'])) {
            $updateData['transport_id'] = $data['transport_id'];
        }
        if (isset($data['budget_id'])) {
            // Verify budget belongs to organization
            if ($data['budget_id']) {
                $budget = DB::table('budgets')
                    ->where('budget_id', $data['budget_id'])
                    ->where('organization_id', $orgUserId)
                    ->first();
                if (!$budget) {
                    return response()->json(['message' => 'Budget not found or not authorized'], 404)
                        ->header('Access-Control-Allow-Origin', '*');
                }
            }
            $updateData['budget_id'] = $data['budget_id'];
        }
        if (isset($data['departure_date'])) {
            $updateData['departure_date'] = $data['departure_date'];
        }

        if (empty($updateData)) {
            return response()->json(['message' => 'No fields to update'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        DB::table('shipments')->where('shipment_id', $id)->update($updateData);

        return response()->json(['message' => 'Shipment updated successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }


    public function addPackage(Request $request, $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $data = $request->all();
        $validator = Validator::make($data, [
            'order_id' => 'required|integer|exists:orders,order_id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Verify shipment group belongs to user's organization
        $shipmentGroup = DB::table('shipments as sg')
            ->whereExists(function ($query) use ($orgUserId) {
                $query->select(DB::raw(1))
                    ->from('shipment_details as sp')
                    ->join('orders as o', 'sp.order_id', '=', 'o.order_id')
                    ->whereColumn('sp.shipment_id', 'sg.shipment_id')
                    ->where('o.organization_id', $orgUserId);
            })
            ->where('sg.shipment_id', $id)
            ->select('sg.*')
            ->first();

        if (!$shipmentGroup) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Verify order belongs to user's organization and doesn't already have a package
        $order = DB::table('orders as o')
            ->leftJoin('quotes as q', 'o.quote_id', '=', 'q.quote_id')
            ->where('o.order_id', $data['order_id'])
            ->where('o.organization_id', $orgUserId)
            ->select('o.*', 'q.estimated_cost')
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Check if order already has a package
        $existingPackage = DB::table('shipment_details')->where('order_id', $data['order_id'])->first();
        if ($existingPackage) {
            return response()->json(['message' => 'This order is already assigned to a shipment'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Generate unique tracking number for this package
        $uniqueTrackingNumber = $this->generateUniqueTrackingNumber();

        // Create new package with all required fields
        DB::table('shipment_details')->insert([
            'tracking_id' => $uniqueTrackingNumber,
            'shipment_id' => $id,
            'order_id' => $data['order_id'],
            'receiver_name' => $order->receiver_name ?? 'N/A',
            'receiver_contact' => $order->receiver_contact ?? '',
            'receiver_email' => $order->receiver_email ?? '',
            'receiver_address' => $order->receiver_address ?? '',
            'receiver_lat' => $order->receiver_lat ?? null,
            'receiver_lng' => $order->receiver_lng ?? null,
            'charges' => 0,
            'status' => 'pending',
            'created_at' => now(),
        ]);

        // Send email notification to customer
        if (!empty($order->receiver_email)) {
            try {
                // Convert estimated_cost from cents to pesos (divide by 100)
                $shippingCost = isset($order->estimated_cost) ? ($order->estimated_cost / 100) : 0;

                $this->sendShipmentNotificationEmail(
                    $order->receiver_email,
                    $order->customer_name,
                    $order->receiver_name,
                    $uniqueTrackingNumber,
                    $order->receiver_name,
                    $order->receiver_address,
                    $shippingCost,
                    $shipmentGroup->departure_date
                );
            } catch (\Exception $e) {
                \Log::error('Failed to send tracking email when adding package: ' . $e->getMessage());
            }
        }

        return response()->json(['message' => 'Package added to shipment successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function removePackage(Request $request, int $id, int $orderId)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);

        // Verify shipment group belongs to user's organization
        $shipmentGroup = DB::table('shipments as sg')
            ->whereExists(function ($query) use ($orgUserId) {
                $query->select(DB::raw(1))
                    ->from('shipment_details as sp')
                    ->join('orders as o', 'sp.order_id', '=', 'o.order_id')
                    ->whereColumn('sp.shipment_id', 'sg.shipment_id')
                    ->where('o.organization_id', $orgUserId);
            })
            ->where('sg.shipment_id', $id)
            ->first();

        if (!$shipmentGroup) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Find package for this order
        $package = DB::table('shipment_details as sp')
            ->join('orders as o', 'sp.order_id', '=', 'o.order_id')
            ->where('sp.shipment_id', $id)
            ->where('sp.order_id', $orderId)
            ->where('o.organization_id', $orgUserId)
            ->select('sp.tracking_id', 'o.receiver_email', 'o.customer_name')
            ->first();

        if (!$package) {
            return response()->json(['message' => 'Package not found in this shipment'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Check if this is the last package
        $packageCount = DB::table('shipment_details')
            ->where('shipment_id', $id)
            ->count();

        if ($packageCount <= 1) {
            return response()->json(['message' => 'Cannot remove the last package from a shipment'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Send cancellation email notification
        if (!empty($package->receiver_email)) {
            try {
                $this->sendPackageRemovalEmail(
                    $package->receiver_email,
                    $package->customer_name,
                    $package->tracking_id
                );
            } catch (\Exception $e) {
                \Log::error('Failed to send package removal email: ' . $e->getMessage());
            }
        }

        // Delete the package
        DB::table('shipment_details')->where('shipment_package_id', $package->shipment_package_id)->delete();

        // Always return the same shipment_id (it never changes!)
        return response()->json([
            'message' => 'Package removed from shipment successfully',
            'redirect_to_shipment_id' => $id
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function track(string $trackingNumber)
    {
        // Find package by tracking number
        $package = DB::table('shipment_details as sp')
            ->join('shipments as sg', 'sp.shipment_id', '=', 'sg.shipment_id')
            ->join('orders as o', 'sp.order_id', '=', 'o.order_id')
            ->leftJoin('transport as t', 'sg.transport_id', '=', 't.transport_id')
            ->leftJoin('users as d', 'sg.driver_id', '=', 'd.user_id')
            ->select(
                'sp.tracking_id',
                'sp.shipment_id',
                'sp.status',
                'o.receiver_name',
                'o.receiver_address',
                'sg.creation_date',
                'sg.departure_date',
                'd.username as driver',
                't.registration_number'
            )
            ->where('sp.tracking_id', $trackingNumber)
            ->first();

        if (!$package) {
            return response()->json(['message' => 'Tracking number not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Get tracking history for this specific package only
        $trackingHistory = DB::table('tracking_history')
            ->where('tracking_id', $package->tracking_id)
            ->orderBy('timestamp', 'asc')
            ->get();

        $data = [
            'tracking_id' => $package->tracking_id,
            'receiver_name' => $package->receiver_name,
            'destination' => $package->receiver_name,
            'destination_address' => $package->receiver_address,
            'current_status' => $package->status,
            'creation_date' => $package->creation_date,
            'departure_date' => $package->departure_date,
            'driver' => $package->driver ?? 'Not assigned',
            'vehicle' => $package->registration_number ?? 'Not assigned',
            'tracking_history' => $trackingHistory->map(function($item) {
                return [
                    'timestamp' => $item->timestamp,
                    'location' => $item->location,
                    'status' => $item->status,
                    'details' => $item->details,
                ];
            }),
        ];

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
    }

    private function generateTrackingNumber(): string
    {
        do {
            // Generate shipment number with SHP prefix and random 6-digit number
            $randomNumber = random_int(100000, 999999);
            $trackingNumber = 'SHP-' . $randomNumber;
        } while (DB::table('shipments')->where('shipment_id', $trackingNumber)->exists());

        return $trackingNumber;
    }

    private function generateUniqueTrackingNumber(): string
    {
        do {
            // Generate unique tracking number with TRK prefix and random 6-digit number
            $randomNumber = random_int(100000, 999999);
            $trackingNumber = 'TRK-' . $randomNumber;
        } while (DB::table('shipment_details')->where('tracking_id', $trackingNumber)->exists());

        return $trackingNumber;
    }

    private function createInvoiceForDeliveredShipment(int $shipmentId): void
    {
        try {
            // Check if invoice already exists for this shipment
            $existingInvoice = Invoice::where('shipment_id', $shipmentId)->first();
            if ($existingInvoice) {
                \Log::info('Invoice already exists for shipment', ['shipment_id' => $shipmentId, 'invoice_id' => $existingInvoice->invoice_id]);
                return; // Invoice already exists
            }

            // Get shipment with order relationship
            $shipment = Shipment::with('order')->find($shipmentId);
            if (!$shipment) {
                \Log::error('Shipment not found for invoice creation', ['shipment_id' => $shipmentId]);
                return;
            }

            if (!$shipment->order) {
                \Log::error('No order found for shipment during invoice creation', ['shipment_id' => $shipmentId]);
                return;
            }

            \Log::info('Creating invoice for delivered shipment', [
                'shipment_id' => $shipmentId,
                'order_id' => $shipment->order_id,
                'charges' => $shipment->charges
            ]);

            // Create invoice automatically with Net 30 terms
            $invoice = Invoice::createFromShipment($shipment, [
                'notes' => 'Auto-generated invoice upon delivery completion'
            ]);

            \Log::info('Invoice created successfully for delivered shipment', [
                'shipment_id' => $shipmentId,
                'invoice_id' => $invoice->invoice_id,
                'invoice_number' => $invoice->invoice_number
            ]);

        } catch (\Exception $e) {
            // Log error but don't fail the shipment update
            \Log::error('Failed to create invoice for delivered shipment: ' . $e->getMessage(), [
                'shipment_id' => $shipmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    // GPS Tracking Methods
    public function updateLocation(Request $request, $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $validator = Validator::make($request->all(), [
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'driver_id' => 'required|integer',
            'speed' => 'nullable|numeric|min:0',
            'accuracy' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Verify shipment group belongs to user
        $shipmentGroup = DB::table('shipments as sg')
            ->whereExists(function ($query) use ($orgUserId) {
                $query->select(DB::raw(1))
                    ->from('shipment_details as sp')
                    ->join('orders as o', 'sp.order_id', '=', 'o.order_id')
                    ->whereColumn('sp.shipment_id', 'sg.shipment_id')
                    ->where('o.organization_id', $orgUserId);
            })
            ->where('sg.shipment_id', $id)
            ->first();

        if (!$shipmentGroup) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Store GPS location for shipment group
        DB::table('gps_locations')->insert([
            'shipment_id' => $id,  // Still using shipment_id column name for GPS locations
            'driver_id' => $request->driver_id,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'speed' => $request->speed,
            'accuracy' => $request->accuracy,
            'recorded_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Location updated successfully',
            'location' => [
                'latitude' => (float) $request->latitude,
                'longitude' => (float) $request->longitude,
            ]
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function getLocation($id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);

        // Verify shipment group belongs to user
        $shipmentExists = DB::table('shipments as sg')
            ->whereExists(function ($query) use ($orgUserId) {
                $query->select(DB::raw(1))
                    ->from('shipment_details as sp')
                    ->join('orders as o', 'sp.order_id', '=', 'o.order_id')
                    ->whereColumn('sp.shipment_id', 'sg.shipment_id')
                    ->where('o.organization_id', $orgUserId);
            })
            ->where('sg.shipment_id', $id)
            ->exists();

        if (!$shipmentExists) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Get latest GPS location for shipment
        $location = DB::table('gps_locations')
            ->where('shipment_id', $id)
            ->orderByDesc('recorded_at')
            ->first();

        if (!$location) {
            return response()->json([
                'message' => 'No GPS data available',
                'location' => null
            ])->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json([
            'location' => [
                'latitude' => (float) $location->latitude,
                'longitude' => (float) $location->longitude,
                'speed' => (float) $location->speed,
                'accuracy' => (float) $location->accuracy,
                'recorded_at' => $location->recorded_at,
            ]
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function getLocationHistory($id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);

        // Verify shipment group belongs to user
        $shipmentExists = DB::table('shipments as sg')
            ->whereExists(function ($query) use ($orgUserId) {
                $query->select(DB::raw(1))
                    ->from('shipment_details as sp')
                    ->join('orders as o', 'sp.order_id', '=', 'o.order_id')
                    ->whereColumn('sp.shipment_id', 'sg.shipment_id')
                    ->where('o.organization_id', $orgUserId);
            })
            ->where('sg.shipment_id', $id)
            ->exists();

        if (!$shipmentExists) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Get GPS tracking history for shipment
        $locations = DB::table('gps_locations')
            ->where('shipment_id', $id)
            ->orderBy('recorded_at')
            ->get();

        $data = $locations->map(function ($loc) {
            return [
                'latitude' => (float) $loc->latitude,
                'longitude' => (float) $loc->longitude,
                'speed' => (float) $loc->speed,
                'recorded_at' => $loc->recorded_at,
            ];
        });

        return response()->json([
            'history' => $data,
            'count' => $data->count()
        ])->header('Access-Control-Allow-Origin', '*');
    }

    /**
     * Send SMS notification using Semaphore API
     *
     * @param string $phoneNumber - Philippine mobile number (e.g., 09123456789 or +639123456789)
     * @param string $message - SMS message content
     * @return bool - Success status
     */
    private function sendSMS(string $phoneNumber, string $message): bool
    {
        // Get Semaphore API key from environment
        $apiKey = env('SEMAPHORE_API_KEY');

        if (empty($apiKey)) {
            \Log::warning('Semaphore API key not configured. SMS not sent.');
            return false;
        }

        // Format phone number to Philippine format (+63)
        $phoneNumber = $this->formatPhoneNumber($phoneNumber);

        try {
            $ch = curl_init();
            $parameters = [
                'apikey' => $apiKey,
                'number' => $phoneNumber,
                'message' => $message,
                'sendername' => env('SEMAPHORE_SENDER_NAME', 'LogiSync')
            ];

            curl_setopt($ch, CURLOPT_URL, 'https://api.semaphore.co/api/v4/messages');
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($parameters));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);

            $output = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode >= 200 && $httpCode < 300) {
                \Log::info('SMS sent successfully', ['phone' => $phoneNumber]);
                return true;
            } else {
                \Log::error('Failed to send SMS', [
                    'phone' => $phoneNumber,
                    'http_code' => $httpCode,
                    'response' => $output
                ]);
                return false;
            }
        } catch (\Exception $e) {
            \Log::error('SMS sending exception: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Format phone number to Philippine international format
     *
     * @param string $phoneNumber
     * @return string
     */
    private function formatPhoneNumber(string $phoneNumber): string
    {
        // Remove spaces, dashes, and parentheses
        $phoneNumber = preg_replace('/[\s\-\(\)]/', '', $phoneNumber);

        // If starts with 0, replace with +63
        if (substr($phoneNumber, 0, 1) === '0') {
            $phoneNumber = '+63' . substr($phoneNumber, 1);
        }
        // If starts with 63 but no +, add +
        elseif (substr($phoneNumber, 0, 2) === '63') {
            $phoneNumber = '+' . $phoneNumber;
        }
        // If doesn't start with + or 63, assume it's a local number without 0
        elseif (substr($phoneNumber, 0, 1) !== '+') {
            $phoneNumber = '+63' . $phoneNumber;
        }

        return $phoneNumber;
    }

    private function sendShipmentNotificationEmail($email, $customerName, $receiverName, $trackingNumber, $destinationName, $destinationAddress, $charges, $departureDate)
    {
        $createdDate = Carbon::now()->format('F d, Y h:i A');
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $chargesFormatted = number_format($charges, 2);
        $departureDateFormatted = $departureDate ? Carbon::parse($departureDate)->format('F d, Y') : 'To be scheduled';

        $emailBody = "
<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            line-height: 1.6;
        }
        .email-container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
        }
        .header {
            background: #5469d4;
            padding: 40px 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            color: white;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 40px;
        }
        .status-section {
            text-align: center;
            margin-bottom: 30px;
        }
        .status-section h2 {
            margin: 0 0 8px;
            font-size: 20px;
            color: #1a1a1a;
            font-weight: 600;
        }
        .status-section p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
        }
        .status-badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
            margin-bottom: 16px;
        }
        .tracking-box {
            background: #f9fafb;
            border: 2px solid #5469d4;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
        }
        .tracking-number {
            font-size: 28px;
            font-weight: 700;
            color: #5469d4;
            font-family: monospace;
            letter-spacing: 2px;
            margin: 8px 0;
        }
        .divider {
            border: 0;
            border-top: 1px solid #e5e7eb;
            margin: 24px 0;
        }
        .info-row {
            display: table;
            width: 100%;
            margin-bottom: 12px;
        }
        .info-label {
            display: table-cell;
            color: #6b7280;
            font-size: 14px;
            padding: 8px 0;
        }
        .info-value {
            display: table-cell;
            color: #1a1a1a;
            font-size: 14px;
            font-weight: 500;
            text-align: right;
            padding: 8px 0;
        }
        .charges-box {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin: 24px 0;
        }
        .charges-row {
            display: table;
            width: 100%;
        }
        .charges-label {
            display: table-cell;
            font-size: 16px;
            font-weight: 600;
            color: #1a1a1a;
        }
        .charges-amount {
            display: table-cell;
            font-size: 24px;
            font-weight: 700;
            color: #5469d4;
            text-align: right;
        }
        .track-button {
            display: inline-block;
            background: #5469d4;
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 24px 0;
        }
        .info-box {
            background: #dbeafe;
            border-left: 4px solid #3b82f6;
            padding: 16px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .info-box p {
            margin: 0;
            color: #1e40af;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            padding: 30px 40px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 4px 0;
            color: #6b7280;
            font-size: 13px;
        }
        .footer a {
            color: #5469d4;
            text-decoration: none;
        }
        .merchant-name {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin-top: 8px;
        }
    </style>
</head>
<body>
    <div class='email-container'>
        <div class='header'>
            <h1>🚚 Shipment Ready for Dispatch</h1>
            <p class='merchant-name'>LogiSync Logistics</p>
        </div>

        <div class='content'>
            <div class='status-section'>
                <span class='status-badge'>READY TO SHIP</span>
                <h2>Your Package is Ready!</h2>
                <p>{$createdDate}</p>
            </div>

            <p style='color: #6b7280; font-size: 15px; line-height: 1.6;'>
                Hello <strong>{$customerName}</strong>,
            </p>

            <p style='color: #6b7280; font-size: 15px; line-height: 1.6; margin-top: 16px;'>
                Great news! Your shipment has been created and is ready for dispatch.
                You can track your package status updates using the tracking number below.
            </p>

            <div class='tracking-box'>
                <p style='margin: 0 0 8px 0; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;'>
                    Tracking Number
                </p>
                <div class='tracking-number'>{$trackingNumber}</div>
            </div>

            <hr class='divider'>

            <div class='info-row'>
                <span class='info-label'>Receiver Name</span>
                <span class='info-value'>{$receiverName}</span>
            </div>
            <div class='info-row'>
                <span class='info-label'>Delivering To</span>
                <span class='info-value'>{$destinationAddress}</span>
            </div>
            <div class='info-row'>
                <span class='info-label'>Estimated Departure</span>
                <span class='info-value'>{$departureDateFormatted}</span>
            </div>

            <div class='charges-box'>
                <div class='charges-row'>
                    <span class='charges-label'>Shipping Cost</span>
                    <span class='charges-amount'>₱{$chargesFormatted}</span>
                </div>
            </div>

            <div style='text-align: center;'>
                <a href='{$frontendUrl}' class='track-button'>Track Your Shipment</a>
            </div>

            <div class='info-box'>
                <p>
                    <strong>📍 How to Track:</strong> Visit our website and enter your tracking number on the landing page to see status updates about your shipment's progress.
                </p>
            </div>

            <hr class='divider'>

            <p style='color: #6b7280; font-size: 14px; line-height: 1.6;'>
                If you have any questions about your shipment, please don't hesitate to contact us.
            </p>
        </div>

        <div class='footer'>
            <p>LogiSync - Philippines</p>
        </div>
    </div>
</body>
</html>
";

        \Mail::send([], [], function ($message) use ($email, $trackingNumber, $emailBody) {
            $message->to($email)
                ->subject("🚚 Shipment Ready - Track #{$trackingNumber}")
                ->html($emailBody);
        });

        \Log::info("Shipment notification email sent to: {$email}");
    }

    private function sendPackageRemovalEmail($email, $customerName, $trackingNumber)
    {
        $cancelledDate = Carbon::now()->format('F d, Y h:i A');
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');

        $emailBody = "
<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            line-height: 1.6;
        }
        .email-container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
        }
        .header {
            background: #ef4444;
            padding: 40px 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            color: white;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 40px;
        }
        .status-section {
            text-align: center;
            margin-bottom: 30px;
        }
        .status-section h2 {
            margin: 0 0 8px;
            font-size: 20px;
            color: #1a1a1a;
            font-weight: 600;
        }
        .status-section p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
        }
        .status-badge {
            display: inline-block;
            background: #ef4444;
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
            margin-bottom: 16px;
        }
        .tracking-box {
            background: #fef2f2;
            border: 2px solid #ef4444;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
        }
        .tracking-number {
            font-size: 28px;
            font-weight: 700;
            color: #ef4444;
            font-family: monospace;
            letter-spacing: 2px;
            margin: 8px 0;
        }
        .divider {
            border: 0;
            border-top: 1px solid #e5e7eb;
            margin: 24px 0;
        }
        .info-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .info-box p {
            margin: 0;
            color: #92400e;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            padding: 30px 40px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 4px 0;
            color: #6b7280;
            font-size: 13px;
        }
        .footer a {
            color: #ef4444;
            text-decoration: none;
        }
        .merchant-name {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin-top: 8px;
        }
        .support-button {
            display: inline-block;
            background: #ef4444;
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 24px 0;
        }
    </style>
</head>
<body>
    <div class='email-container'>
        <div class='header'>
            <h1>❌ Shipment Cancelled</h1>
            <p class='merchant-name'>LogiSync Logistics</p>
        </div>

        <div class='content'>
            <div class='status-section'>
                <span class='status-badge'>SHIPMENT CANCELLED</span>
                <h2>Your Package Has Been Removed</h2>
                <p>{$cancelledDate}</p>
            </div>

            <p style='color: #6b7280; font-size: 15px; line-height: 1.6;'>
                Hello <strong>{$customerName}</strong>,
            </p>

            <p style='color: #6b7280; font-size: 15px; line-height: 1.6; margin-top: 16px;'>
                We wanted to inform you that your shipment has been removed from the delivery schedule and is no longer active.
            </p>

            <div class='tracking-box'>
                <p style='margin: 0 0 8px 0; color: #991b1b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;'>
                    Cancelled Tracking Number
                </p>
                <div class='tracking-number'>{$trackingNumber}</div>
            </div>

            <div class='info-box'>
                <p>
                    <strong>⚠️ Important:</strong> This tracking number is no longer valid and will not show any updates. If you believe this is an error, please contact our support team immediately.
                </p>
            </div>

            <div style='text-align: center;'>
                <a href='{$frontendUrl}' class='support-button'>Contact Support</a>
            </div>

            <hr class='divider'>

            <p style='color: #6b7280; font-size: 14px; line-height: 1.6;'>
                If you have any questions or concerns about this cancellation, please don't hesitate to contact our support team. We're here to help resolve any issues.
            </p>
        </div>

        <div class='footer'>
            <p>LogiSync - Philippines</p>
        </div>
    </div>
</body>
</html>
";

        \Mail::send([], [], function ($message) use ($email, $trackingNumber, $emailBody) {
            $message->to($email)
                ->subject("❌ Shipment Cancelled - Track #{$trackingNumber}")
                ->html($emailBody);
        });

        \Log::info("Package removal notification email sent to: {$email}");
    }
}