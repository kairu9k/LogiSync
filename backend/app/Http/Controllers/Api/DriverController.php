<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class DriverController extends Controller
{
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

        // Get driver's vehicle info with capacity
        $driverVehicle = DB::table('transport as t')
            ->where('t.driver_id', $driverId)
            ->select('t.transport_id', 't.capacity', 't.vehicle_id', 't.registration_number', 't.vehicle_type')
            ->first();

        $vehicleCapacity = null;
        if ($driverVehicle) {
            // Calculate current load
            $currentLoad = DB::table('shipments as s')
                ->join('orders as o', 's.order_id', '=', 'o.order_id')
                ->join('quotes as q', 'o.quote_id', '=', 'q.quote_id')
                ->where('s.transport_id', $driverVehicle->transport_id)
                ->whereIn('s.status', ['pending', 'in_transit', 'out_for_delivery'])
                ->sum('q.weight');

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

        $shipments = DB::table('shipments as s')
            ->join('transport as t', 's.transport_id', '=', 't.transport_id')
            ->join('users as d', 't.driver_id', '=', 'd.user_id')
            ->leftJoin('orders as o', 's.order_id', '=', 'o.order_id')
            ->where('d.user_id', $driverId)
            ->whereIn('s.status', ['pending', 'in_transit', 'out_for_delivery'])
            ->select(
                's.shipment_id',
                's.tracking_number',
                's.receiver_name',
                's.receiver_address',
                's.destination_address',
                's.status',
                's.creation_date',
                's.departure_date',
                'o.customer_name as customer',
                't.registration_number',
                't.vehicle_type'
            )
            ->orderBy('s.departure_date')
            ->orderBy('s.creation_date')
            ->get();

        $data = $shipments->map(function ($s) {
            return [
                'id' => (int) $s->shipment_id,
                'tracking_number' => $s->tracking_number,
                'receiver_name' => $s->receiver_name,
                'receiver_address' => $s->receiver_address,
                'destination_address' => $s->destination_address,
                'status' => $s->status,
                'customer' => $s->customer ?? 'N/A',
                'vehicle' => $s->registration_number . ' (' . $s->vehicle_type . ')',
                'priority' => $s->status === 'pending' ? 'high' : ($s->status === 'out_for_delivery' ? 'urgent' : 'normal')
            ];
        });

        return response()->json([
            'data' => $data,
            'vehicle_capacity' => $vehicleCapacity,
            'summary' => [
                'total' => $data->count(),
                'pending' => $data->where('status', 'pending')->count(),
                'in_transit' => $data->where('status', 'in_transit')->count(),
                'out_for_delivery' => $data->where('status', 'out_for_delivery')->count(),
            ]
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function updateShipmentStatus(Request $request, int $shipmentId)
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

        // Verify driver has access to this shipment
        $shipment = DB::table('shipments as s')
            ->join('transport as t', 's.transport_id', '=', 't.transport_id')
            ->where('s.shipment_id', $shipmentId)
            ->where('t.driver_id', $data['driver_id'])
            ->first();

        if (!$shipment) {
            return response()->json(['message' => 'Shipment not found or access denied'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Map driver status to system status
        $systemStatus = $this->mapDriverStatus($data['status']);

        // Update shipment status
        DB::table('shipments')->where('shipment_id', $shipmentId)->update([
            'status' => $systemStatus,
        ]);

        // Add tracking history
        DB::table('tracking_history')->insert([
            'shipment_id' => $shipmentId,
            'location' => $data['location'],
            'status' => $systemStatus,
            'details' => $data['notes'] ?? $this->getDefaultStatusMessage($data['status']),
        ]);

        // Auto-generate invoice when driver marks shipment as delivered
        if ($systemStatus === 'delivered') {
            $this->createInvoiceForDeliveredShipment($shipmentId);
        }

        return response()->json([
            'message' => 'Status updated successfully',
            'new_status' => $systemStatus
        ])->header('Access-Control-Allow-Origin', '*');
    }

    private function mapDriverStatus($driverStatus)
    {
        $statusMap = [
            'picked_up' => 'in_transit',
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
                'q.dimensions',
                'q.distance'
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
            'distance' => $shipment->distance ? number_format($shipment->distance, 1) . ' km' : 'N/A',
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