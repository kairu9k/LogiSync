<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Shipment;
use App\Events\ShipmentStatusUpdated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class DriverController extends Controller
{
    public function index(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        // Get the organization_id from the user
        $user = DB::table('users')->where('user_id', $userId)->first();
        $organizationId = $user ? $user->organization_id : null;

        if (!$organizationId) {
            return response()->json(['message' => 'User organization not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Get all drivers from the same organization
        $query = DB::table('users')
            ->where('role', 'driver')
            ->where('organization_id', $organizationId);

        // If exclude_assigned parameter is true, exclude drivers assigned to active shipments
        if ($request->query('exclude_assigned') === 'true') {
            $query->whereNotIn('user_id', function($subquery) {
                $subquery->select('driver_id')
                    ->from('shipments')
                    ->whereNotNull('driver_id')
                    ->whereIn('status', ['pending', 'in_transit', 'out_for_delivery']);
            });
        }

        $drivers = $query->select('user_id as id', 'username as name', 'email')->get();

        return response()->json(['data' => $drivers])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function login(Request $request)
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Find driver by username
        $driver = DB::table('users')
            ->where('username', $data['username'])
            ->where('role', 'driver')
            ->first();

        if (!$driver) {
            return response()->json(['message' => 'Invalid credentials'], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Verify password using bcrypt hash
        if (!Hash::check($data['password'], $driver->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json([
            'message' => 'Login successful',
            'driver' => [
                'id' => $driver->user_id,
                'username' => $driver->username,
                'email' => $driver->email,
                'role' => $driver->role,
            ]
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function getMyShipments(Request $request)
    {
        $driverId = $request->query('driver_id');
        if (!$driverId) {
            return response()->json(['message' => 'Driver ID required'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $today = date('Y-m-d');

        // Get driver's vehicle info with capacity from shipments
        $driverVehicle = DB::table('shipments as s')
            ->join('transport as t', 's.transport_id', '=', 't.transport_id')
            ->where('s.driver_id', $driverId)
            ->select('t.transport_id', 't.capacity', 't.vehicle_id', 't.registration_number', 't.vehicle_type')
            ->first();

        $vehicleCapacity = null;
        if ($driverVehicle) {
            // Calculate current load from shipment_details (all packages not yet delivered)
            $currentLoad = DB::table('shipments as s')
                ->join('shipment_details as sd', 's.shipment_id', '=', 'sd.shipment_id')
                ->where('s.transport_id', $driverVehicle->transport_id)
                ->whereIn('sd.status', ['pending', 'picked_up', 'in_transit', 'out_for_delivery'])
                ->sum('sd.weight');

            $currentLoad = $currentLoad ?? 0;
            $capacity = (float) $driverVehicle->capacity;
            $utilizationPercent = $capacity > 0 ? round(($currentLoad / $capacity) * 100, 1) : 0;

            $vehicleCapacity = [
                'vehicle_id' => $driverVehicle->vehicle_id,
                'registration' => $driverVehicle->registration_number,
                'vehicle_type' => $driverVehicle->vehicle_type,
                'capacity' => $capacity,
                'current_load' => round($currentLoad, 1),
                'available_capacity' => round($capacity - $currentLoad, 1),
                'utilization_percent' => $utilizationPercent,
            ];
        }

        // Get master shipments for this driver
        $shipments = DB::table('shipments as s')
            ->join('transport as t', 's.transport_id', '=', 't.transport_id')
            ->where('s.driver_id', $driverId)
            ->whereIn('s.status', ['pending', 'picked_up', 'in_transit', 'out_for_delivery'])
            ->select(
                's.shipment_id',
                's.transport_id',
                's.status',
                's.creation_date',
                's.departure_date',
                's.origin_name',
                's.origin_address',
                't.registration_number',
                't.vehicle_type',
                't.capacity',
                't.volume_capacity'
            )
            ->orderByRaw("FIELD(s.status, 'pending', 'picked_up', 'in_transit', 'out_for_delivery')")
            ->orderBy('s.departure_date')
            ->orderBy('s.creation_date')
            ->get();

        $data = $shipments->map(function ($s) {
            // Get all packages for this shipment
            $packages = DB::table('shipment_details as sd')
                ->leftJoin('orders as o', 'sd.order_id', '=', 'o.order_id')
                ->where('sd.shipment_id', $s->shipment_id)
                ->select(
                    'sd.tracking_id',
                    'sd.receiver_name',
                    'sd.receiver_contact',
                    'sd.receiver_email',
                    'sd.receiver_address',
                    'sd.weight',
                    'sd.charges',
                    'sd.status',
                    'sd.notes',
                    'o.customer_name'
                )
                ->get()
                ->map(function ($pkg) {
                    return [
                        'tracking_id' => $pkg->tracking_id,
                        'receiver_name' => $pkg->receiver_name,
                        'receiver_contact' => $pkg->receiver_contact ?? 'N/A',
                        'receiver_email' => $pkg->receiver_email ?? '',
                        'receiver_address' => $pkg->receiver_address,
                        'weight' => $pkg->weight ? round($pkg->weight, 1) : 0,
                        'charges' => (int) $pkg->charges,
                        'status' => $pkg->status,
                        'notes' => $pkg->notes ?? '',
                        'customer' => $pkg->customer_name ?? 'N/A'
                    ];
                });

            // Get unique destinations count
            $uniqueDestinations = $packages->pluck('receiver_address')->unique()->count();

            // Calculate total weight and charges
            $totalWeight = $packages->sum('weight');
            $totalCharges = $packages->sum('charges');

            // Calculate total volume from packages (L × W × H / 1000000 to convert cm³ to m³)
            $totalVolume = 0;
            foreach ($packages as $pkg) {
                if ($pkg['weight'] > 0) {
                    $length = (float) ($pkg['length'] ?? 0);
                    $width = (float) ($pkg['width'] ?? 0);
                    $height = (float) ($pkg['height'] ?? 0);

                    if ($length > 0 && $width > 0 && $height > 0) {
                        // Convert from cm³ to m³
                        $volumeM3 = ($length * $width * $height) / 1000000;
                        $totalVolume += $volumeM3;
                    }
                }
            }

            return [
                'id' => (int) $s->shipment_id,
                'shipment_number' => 'SHP-' . str_pad($s->shipment_id, 6, '0', STR_PAD_LEFT),
                'status' => $s->status,
                'origin_name' => $s->origin_name ?? 'Warehouse',
                'origin_address' => $s->origin_address ?? 'N/A',
                'vehicle' => $s->registration_number . ' (' . $s->vehicle_type . ')',
                'departure_date' => $s->departure_date,
                'creation_date' => $s->creation_date,
                'packages' => $packages,
                'package_count' => $packages->count(),
                'unique_destinations' => $uniqueDestinations,
                'total_weight' => round($totalWeight, 1),
                'total_volume' => round($totalVolume, 2),
                'total_charges' => $totalCharges,
                'vehicle_capacity' => (float) ($s->capacity ?? 0),
                'vehicle_volume_capacity' => (float) ($s->volume_capacity ?? 0),
                'priority' => $s->status === 'pending' ? 'high' : ($s->status === 'out_for_delivery' ? 'urgent' : 'normal')
            ];
        });

        // Calculate package-level summary
        $allPackages = $data->pluck('packages')->flatten(1);

        return response()->json([
            'data' => $data,
            'vehicle_capacity' => $vehicleCapacity,
            'summary' => [
                'total_shipments' => $data->count(),
                'total_packages' => $allPackages->count(),
                'pending' => $allPackages->where('status', 'pending')->count(),
                'picked_up' => $allPackages->where('status', 'picked_up')->count(),
                'in_transit' => $allPackages->where('status', 'in_transit')->count(),
                'out_for_delivery' => $allPackages->where('status', 'out_for_delivery')->count(),
            ]
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function updateShipmentStatus(Request $request, string $trackingId)
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'status' => 'required|string|in:picked_up,in_transit,out_for_delivery,delivered,delivery_attempted,exception',
            'location' => 'required|string|max:255',
            'notes' => 'nullable|string',
            'driver_id' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Get package details and verify driver access
        $package = DB::table('shipment_details as sd')
            ->join('shipments as s', 'sd.shipment_id', '=', 's.shipment_id')
            ->where('sd.tracking_id', $trackingId)
            ->where('s.driver_id', $data['driver_id'])
            ->select('sd.*', 's.shipment_id', 's.driver_id')
            ->first();

        if (!$package) {
            return response()->json(['message' => 'Package not found or access denied'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Store old status for event
        $oldStatus = $package->status;

        // Map driver status to system status
        $systemStatus = $this->mapDriverStatus($data['status']);

        // Get better location info if generic location provided
        $location = $data['location'];
        if (in_array($location, ['Driver Location', 'In transit', 'Picked up from warehouse'])) {
            $location = $this->getSmartLocation($package->shipment_id, $data['status']);
        }

        // Update individual package status
        DB::table('shipment_details')->where('tracking_id', $trackingId)->update([
            'status' => $systemStatus,
        ]);

        // Add tracking history for this specific package
        DB::table('tracking_history')->insert([
            'shipment_id' => $package->shipment_id,  // Keep for GPS reference
            'tracking_id' => $trackingId,            // Individual package tracking
            'location' => $location,
            'status' => $systemStatus,
            'details' => $data['notes'] ?? $this->getDefaultStatusMessage($data['status']),
        ]);

        // Check if all packages in shipment are delivered, then update shipment status
        $allPackagesDelivered = DB::table('shipment_details')
            ->where('shipment_id', $package->shipment_id)
            ->where('status', '!=', 'delivered')
            ->count() === 0;

        if ($allPackagesDelivered) {
            DB::table('shipments')->where('shipment_id', $package->shipment_id)->update([
                'status' => 'delivered',
            ]);
        }

        // Auto-generate invoice when ALL packages in shipment are delivered
        if ($allPackagesDelivered) {
            $this->createInvoiceForDeliveredShipment($package->shipment_id);
        }

        // Broadcast real-time status update
        $shipmentModel = Shipment::find($package->shipment_id);
        if ($shipmentModel) {
            \Log::info('Broadcasting package status update', [
                'tracking_id' => $trackingId,
                'shipment_id' => $package->shipment_id,
                'old_status' => $oldStatus,
                'new_status' => $systemStatus,
                'organization_id' => $shipmentModel->organization_id ?? null
            ]);
            event(new ShipmentStatusUpdated($shipmentModel, $oldStatus, $systemStatus, 'driver'));
            \Log::info('Broadcast event fired');
        }

        return response()->json([
            'message' => 'Package status updated successfully',
            'new_status' => $systemStatus
        ])->header('Access-Control-Allow-Origin', '*');
    }

    private function mapDriverStatus($driverStatus)
    {
        $statusMap = [
            'picked_up' => 'picked_up',
            'in_transit' => 'in_transit',
            'out_for_delivery' => 'out_for_delivery',
            'delivered' => 'delivered',
            'delivery_attempted' => 'out_for_delivery',
            'exception' => 'pending'
        ];

        return $statusMap[$driverStatus] ?? 'pending';
    }

    private function getDefaultStatusMessage($driverStatus)
    {
        $messages = [
            'picked_up' => 'Package picked up by driver',
            'in_transit' => 'Package in transit to destination',
            'out_for_delivery' => 'Out for delivery',
            'delivered' => 'Package delivered successfully',
            'delivery_attempted' => 'Delivery attempted - will retry',
            'exception' => 'Exception occurred - requires attention'
        ];

        return $messages[$driverStatus] ?? 'Status updated by driver';
    }

    private function getSmartLocation($shipmentId, $status)
    {
        // Get shipment with origin info only (destination fields no longer exist in shipments table)
        $shipment = DB::table('shipments')
            ->where('shipment_id', $shipmentId)
            ->select('origin_name', 'origin_address')
            ->first();

        if (!$shipment) {
            return 'Unknown location';
        }

        // Return smart location based on status
        switch ($status) {
            case 'picked_up':
                // Use origin name (should contain warehouse/pickup location)
                return $shipment->origin_name ? "Picked up from {$shipment->origin_name}" : 'Picked up from warehouse';

            case 'in_transit':
                return 'In transit to destination';

            case 'out_for_delivery':
                return 'Out for delivery';

            case 'delivered':
                return 'Delivered to customer';

            case 'delivery_attempted':
                return 'Delivery attempted';

            case 'exception':
                return 'Exception - requires attention';

            default:
                return 'Location update';
        }
    }

    public function getShipmentDetail(Request $request, int $shipmentId)
    {
        $driverId = $request->query('driver_id');
        if (!$driverId) {
            return response()->json(['message' => 'Driver ID required'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $shipment = DB::table('shipments as s')
            ->join('transport as t', 's.transport_id', '=', 't.transport_id')
            ->leftJoin('orders as o', 's.order_id', '=', 'o.order_id')
            ->leftJoin('quotes as q', 'o.quote_id', '=', 'q.quote_id')
            ->where('s.shipment_id', $shipmentId)
            ->where('t.driver_id', $driverId)
            ->select(
                's.*',
                'o.customer_name as customer',
                't.registration_number',
                't.vehicle_type',
                'q.weight',
                'q.dimensions'
            )
            ->first();

        if (!$shipment) {
            return response()->json(['message' => 'Shipment not found or access denied'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $trackingHistory = DB::table('tracking_history')
            ->where('shipment_id', $shipmentId)
            ->orderByDesc('timestamp')
            ->limit(5)
            ->get();

        $data = [
            'id' => (int) $shipment->shipment_id,
            'tracking_number' => $shipment->tracking_number,
            'receiver_name' => $shipment->receiver_name,
            'receiver_contact' => $shipment->receiver_contact ?? 'N/A',
            'receiver_address' => $shipment->receiver_address,
            'destination_address' => $shipment->destination_address,
            'origin_name' => $shipment->origin_name,
            'origin_address' => $shipment->origin_address,
            'departure_date' => $shipment->departure_date,
            'status' => $shipment->status,
            'customer' => $shipment->customer ?? 'N/A',
            'vehicle' => $shipment->registration_number . ' (' . $shipment->vehicle_type . ')',
            'weight' => $shipment->weight ? number_format($shipment->weight, 1) . ' kg' : 'N/A',
            'dimensions' => $shipment->dimensions ?? 'N/A',
            'recent_updates' => $trackingHistory->map(function($item) {
                return [
                    'timestamp' => $item->timestamp,
                    'location' => $item->location,
                    'status' => $item->status,
                    'details' => $item->details,
                ];
            })
        ];

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
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

            \Log::info('Creating invoice for delivered shipment (driver)', [
                'shipment_id' => $shipmentId,
                'order_id' => $shipment->order_id,
                'charges' => $shipment->charges
            ]);

            // Create invoice automatically with Net 30 terms
            $invoice = Invoice::createFromShipment($shipment, [
                'notes' => 'Auto-generated invoice upon delivery completion (driver)'
            ]);

            \Log::info('Invoice created successfully for delivered shipment (driver)', [
                'shipment_id' => $shipmentId,
                'invoice_id' => $invoice->invoice_id,
                'invoice_number' => $invoice->invoice_number
            ]);

        } catch (\Exception $e) {
            // Log error but don't fail the shipment update
            \Log::error('Failed to create invoice for delivered shipment (driver): ' . $e->getMessage(), [
                'shipment_id' => $shipmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
}