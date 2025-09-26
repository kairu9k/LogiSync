<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\Transport;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ShipmentController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->query('status');
        $search = $request->query('q');
        $limit = (int) ($request->query('limit', 20));
        $limit = max(1, min($limit, 100));

        $query = DB::table('shipments as s')
            ->leftJoin('orders as o', 's.order_id', '=', 'o.order_id')
            ->leftJoin('users as u', 'o.user_id', '=', 'u.user_id')
            ->leftJoin('transport as t', 's.transport_id', '=', 't.transport_id')
            ->leftJoin('users as d', 't.driver_id', '=', 'd.user_id')
            ->select(
                's.shipment_id',
                's.tracking_number',
                's.receiver_name',
                's.status',
                's.creation_date',
                's.departure_date',
                'u.username as customer',
                'd.username as driver',
                't.registration_number'
            )
            ->orderByDesc('s.creation_date');

        if ($status && $status !== 'any') {
            $query->where('s.status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('s.tracking_number', 'like', "%$search%")
                  ->orWhere('s.receiver_name', 'like', "%$search%")
                  ->orWhere('u.username', 'like', "%$search%");
            });
        }

        $rows = $query->limit($limit)->get();

        $data = $rows->map(function ($row) {
            return [
                'id' => (int) $row->shipment_id,
                'tracking_number' => $row->tracking_number,
                'receiver' => $row->receiver_name,
                'customer' => $row->customer ?? 'N/A',
                'driver' => $row->driver ?? 'N/A',
                'vehicle' => $row->registration_number ?? 'N/A',
                'status' => $row->status,
                'creation_date' => $row->creation_date,
                'departure_date' => $row->departure_date,
            ];
        });

        return response()->json([
            'data' => $data,
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function show(int $id)
    {
        $shipment = DB::table('shipments as s')
            ->leftJoin('orders as o', 's.order_id', '=', 'o.order_id')
            ->leftJoin('users as u', 'o.user_id', '=', 'u.user_id')
            ->leftJoin('transport as t', 's.transport_id', '=', 't.transport_id')
            ->leftJoin('users as d', 't.driver_id', '=', 'd.user_id')
            ->select(
                's.*',
                'u.username as customer',
                'd.username as driver',
                't.registration_number',
                't.vehicle_type'
            )
            ->where('s.shipment_id', $id)
            ->first();

        if (!$shipment) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $trackingHistory = DB::table('tracking_history')
            ->where('shipment_id', $id)
            ->orderByDesc('timestamp')
            ->get();

        $data = [
            'id' => (int) $shipment->shipment_id,
            'tracking_number' => $shipment->tracking_number,
            'receiver_name' => $shipment->receiver_name,
            'receiver_address' => $shipment->receiver_address,
            'origin_name' => $shipment->origin_name,
            'origin_address' => $shipment->origin_address,
            'destination_name' => $shipment->destination_name,
            'destination_address' => $shipment->destination_address,
            'charges' => (int) $shipment->charges,
            'status' => $shipment->status,
            'creation_date' => $shipment->creation_date,
            'departure_date' => $shipment->departure_date,
            'customer' => $shipment->customer ?? 'N/A',
            'driver' => $shipment->driver ?? 'N/A',
            'vehicle' => $shipment->registration_number ?? 'N/A',
            'vehicle_type' => $shipment->vehicle_type ?? 'N/A',
            'tracking_history' => $trackingHistory->map(function($item) {
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

    public function createFromOrder(Request $request, int $orderId)
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'transport_id' => 'required|integer|exists:transport,transport_id',
            'receiver_name' => 'required|string|max:255',
            'receiver_address' => 'required|string',
            'origin_name' => 'required|string|max:255',
            'origin_address' => 'required|string',
            'destination_name' => 'required|string|max:255',
            'destination_address' => 'required|string',
            'charges' => 'required|integer|min:0',
            'departure_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $order = DB::table('orders')->where('order_id', $orderId)->first();
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        if ($order->order_status !== 'fulfilled') {
            return response()->json(['message' => 'Order must be fulfilled before creating shipment'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $existingShipment = DB::table('shipments')->where('order_id', $orderId)->exists();
        if ($existingShipment) {
            return response()->json(['message' => 'Shipment already exists for this order'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $trackingNumber = $this->generateTrackingNumber();

        $shipmentId = DB::table('shipments')->insertGetId([
            'tracking_number' => $trackingNumber,
            'receiver_name' => $data['receiver_name'],
            'receiver_address' => $data['receiver_address'],
            'origin_name' => $data['origin_name'],
            'origin_address' => $data['origin_address'],
            'destination_name' => $data['destination_name'],
            'destination_address' => $data['destination_address'],
            'charges' => $data['charges'],
            'status' => 'pending',
            'departure_date' => $data['departure_date'] ?? null,
            'order_id' => $orderId,
            'transport_id' => $data['transport_id'],
        ], 'shipment_id');

        DB::table('tracking_history')->insert([
            'shipment_id' => $shipmentId,
            'location' => $data['origin_name'],
            'status' => 'pending',
            'details' => 'Shipment created',
        ]);

        return response()->json([
            'message' => 'Shipment created successfully',
            'shipment_id' => $shipmentId,
            'tracking_number' => $trackingNumber,
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }

    public function updateStatus(Request $request, int $id)
    {
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

        $shipment = DB::table('shipments')->where('shipment_id', $id)->first();
        if (!$shipment) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        DB::table('shipments')->where('shipment_id', $id)->update([
            'status' => $data['status'],
        ]);

        DB::table('tracking_history')->insert([
            'shipment_id' => $id,
            'location' => $data['location'],
            'status' => $data['status'],
            'details' => $data['details'] ?? null,
        ]);

        return response()->json(['message' => 'Shipment status updated'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function track(string $trackingNumber)
    {
        $shipment = DB::table('shipments as s')
            ->leftJoin('transport as t', 's.transport_id', '=', 't.transport_id')
            ->leftJoin('users as d', 't.driver_id', '=', 'd.user_id')
            ->select(
                's.shipment_id',
                's.tracking_number',
                's.receiver_name',
                's.destination_name',
                's.destination_address',
                's.status',
                's.creation_date',
                's.departure_date',
                'd.username as driver',
                't.registration_number'
            )
            ->where('s.tracking_number', $trackingNumber)
            ->first();

        if (!$shipment) {
            return response()->json(['message' => 'Tracking number not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $trackingHistory = DB::table('tracking_history')
            ->where('shipment_id', $shipment->shipment_id)
            ->orderBy('timestamp', 'asc')
            ->get();

        $data = [
            'tracking_number' => $shipment->tracking_number,
            'receiver_name' => $shipment->receiver_name,
            'destination' => $shipment->destination_name,
            'destination_address' => $shipment->destination_address,
            'current_status' => $shipment->status,
            'creation_date' => $shipment->creation_date,
            'departure_date' => $shipment->departure_date,
            'driver' => $shipment->driver ?? 'Not assigned',
            'vehicle' => $shipment->registration_number ?? 'Not assigned',
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
            $trackingNumber = 'LS' . strtoupper(uniqid()) . random_int(100, 999);
        } while (DB::table('shipments')->where('tracking_number', $trackingNumber)->exists());

        return $trackingNumber;
    }
}