<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\UserHelper;
use App\Models\Order;
use App\Events\OrderStatusUpdated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        // Basic listing with optional status filter and search by PO (order_id) or username
        $status = $request->query('status');
        $withoutShipment = $request->query('without_shipment');
        $search = $request->query('q');
        $limit = (int) ($request->query('limit', 20));
        $limit = max(1, min($limit, 100));

        $query = DB::table('orders as o')
            ->leftJoin('quotes as q', 'o.quote_id', '=', 'q.quote_id')
            ->leftJoin('inventory as inv', 'o.order_id', '=', 'inv.order_id')
            ->leftJoin('warehouse as w', 'inv.warehouse_id', '=', 'w.warehouse_id')
            ->where('o.organization_id', $orgUserId)
            ->select(
                'o.order_id',
                'o.order_status',
                'o.order_date',
                'o.customer_name',
                'o.package_type',
                'o.receiver_name',
                'o.receiver_contact',
                'o.receiver_email',
                'o.receiver_address',
                'q.weight',
                'q.delivery_zone',
                'q.dimensions',
                'q.package_type as quote_package_type',
                DB::raw('COALESCE(q.items, 0) as items'),
                DB::raw('MAX(w.warehouse_name) as warehouse'),
                DB::raw('MAX(inv.location_in_warehouse) as warehouse_location')
            )
            ->groupBy('o.order_id', 'o.order_status', 'o.order_date', 'o.customer_name', 'o.package_type', 'o.receiver_name', 'o.receiver_contact', 'o.receiver_email', 'o.receiver_address', 'q.items', 'q.weight', 'q.delivery_zone', 'q.dimensions', 'q.package_type')
            ->orderByDesc('o.order_date');

        if ($status && $status !== 'any') {
            $query->where('o.order_status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $numeric = (int) preg_replace('/[^0-9]/', '', $search);
                $q->where('o.customer_name', 'like', "%$search%")
                  ->orWhere('o.order_id', $numeric);
            });
        }

        if ($withoutShipment === 'true') {
            $query->whereNotExists(function ($subQuery) {
                $subQuery->select(DB::raw(1))
                    ->from('shipment_details')
                    ->whereRaw('shipment_details.order_id = o.order_id');
            });
        }

        $rows = $query->limit($limit)->get();

        $data = $rows->map(function ($row) {
            return [
                'id' => (int) $row->order_id,
                'po' => 'PO-' . str_pad((string) $row->order_id, 5, '0', STR_PAD_LEFT),
                'customer' => $row->customer_name ?? 'N/A',
                'items' => (int) $row->items,
                'status' => $row->order_status,
                'order_date' => $row->order_date,
                'package_type' => $row->package_type ?? $row->quote_package_type ?? null,
                'weight' => $row->weight,
                'delivery_zone' => $row->delivery_zone,
                'dimensions' => $row->dimensions,
                'receiver_name' => $row->receiver_name,
                'receiver_contact' => $row->receiver_contact,
                'receiver_email' => $row->receiver_email,
                'receiver_address' => $row->receiver_address,
                'warehouse' => $row->warehouse,
                'warehouse_location' => $row->warehouse_location,
            ];
        });

        return response()->json([
            'data' => $data,
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function show(int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $row = DB::table('orders as o')
            ->leftJoin('quotes as q', 'o.quote_id', '=', 'q.quote_id')
            ->select(
                'o.order_id',
                'o.order_status',
                'o.order_date',
                'o.customer_name',
                'o.package_type',
                'o.receiver_name',
                'o.receiver_contact',
                'o.receiver_email',
                'o.receiver_address',
                'o.quote_id',
                'q.weight',
                'q.dimensions',
                'q.estimated_cost',
                'q.items',
                'q.delivery_zone',
                'q.package_type as quote_package_type'
            )
            ->where('o.order_id', $id)
            ->where('o.organization_id', $orgUserId)
            ->first();

        if (!$row) {
            return response()->json(['message' => 'Order not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $data = [
            'id' => (int) $row->order_id,
            'po' => 'PO-' . str_pad((string) $row->order_id, 5, '0', STR_PAD_LEFT),
            'customer' => $row->customer_name ?? 'N/A',
            'status' => $row->order_status,
            'order_date' => $row->order_date,
            'quote_id' => $row->quote_id,
            'weight' => $row->weight,
            'dimensions' => $row->dimensions,
            'estimated_cost' => $row->estimated_cost,
            'items' => $row->items,
            'delivery_zone' => $row->delivery_zone,
            'package_type' => $row->package_type ?? $row->quote_package_type ?? 'Standard',
            'receiver_name' => $row->receiver_name,
            'receiver_contact' => $row->receiver_contact,
            'receiver_email' => $row->receiver_email,
            'receiver_address' => $row->receiver_address,
        ];

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function store(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $data = $request->all();
        $validator = Validator::make($data, [
            'customer' => 'nullable|string|max:255',
            'status' => 'nullable|string|in:pending,processing,fulfilled,canceled',
            'items' => 'sometimes|array',
            'items.*.product_id' => 'required_with:items|integer',
            'items.*.quantity' => 'required_with:items|integer|min:1',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $status = $data['status'] ?? 'pending';

        $payload = [
            'organization_id' => $orgUserId,
            'order_status' => $status,
        ];
        if (!empty($data['quote_id'])) {
            $payload['quote_id'] = (int)$data['quote_id'];
        }
        if (!empty($data['customer'])) {
            $payload['customer_name'] = $data['customer'];
        }
        $id = DB::table('orders')->insertGetId($payload, 'order_id');

        // Insert order items if provided
        if (!empty($data['items']) && is_array($data['items'])) {
            $rows = [];
            foreach ($data['items'] as $it) {
                if (!isset($it['product_id']) || !isset($it['quantity'])) continue;
                $rows[] = [
                    'order_id' => $id,
                    'product_id' => (int) $it['product_id'],
                    'quantity' => (int) $it['quantity'],
                ];
            }
            if (!empty($rows)) {
                DB::table('order_details')->insert($rows);
            }
        }

        return response()->json([
            'message' => 'Order created',
            'order_id' => $id,
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }

    public function updateStatus(Request $request, int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $data = $request->all();
        $validator = Validator::make($data, [
            'status' => 'required|string|in:pending,processing,fulfilled,canceled',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Get old status before updating
        $order = DB::table('orders')
            ->where('order_id', $id)
            ->where('organization_id', $orgUserId)
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $oldStatus = $order->order_status;
        $newStatus = $data['status'];

        // Validate: Cannot mark as "fulfilled" if no warehouse assignment
        if ($newStatus === 'fulfilled') {
            $inventoryCount = DB::table('inventory')
                ->where('order_id', $id)
                ->count();

            if ($inventoryCount === 0) {
                return response()->json([
                    'message' => 'Cannot mark order as Ready to Ship. Packages must be assigned to a warehouse first. Please go to Inventory page to assign items.'
                ], 400)->header('Access-Control-Allow-Origin', '*');
            }
        }

        DB::table('orders')
            ->where('order_id', $id)
            ->where('organization_id', $orgUserId)
            ->update([
                'order_status' => $newStatus,
            ]);

        // Broadcast real-time status update
        $orderModel = Order::find($id);
        if ($orderModel) {
            \Log::info('Broadcasting order status update', [
                'order_id' => $id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'organization_id' => $orderModel->organization_id ?? null
            ]);
            event(new OrderStatusUpdated($orderModel, $oldStatus, $newStatus, 'admin'));
            \Log::info('Order broadcast event fired');
        }

        return response()->json(['message' => 'Status updated'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function updateReceiverInfo(Request $request, int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $data = $request->all();
        $validator = Validator::make($data, [
            'receiver_name' => 'required|string|max:255',
            'receiver_contact' => 'required|string|max:255',
            'receiver_email' => 'nullable|email|max:255',
            'receiver_address' => 'required|string|max:1000',
            'receiver_lat' => 'nullable|numeric|between:-90,90',
            'receiver_lng' => 'nullable|numeric|between:-180,180',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $order = DB::table('orders')
            ->where('order_id', $id)
            ->where('organization_id', $orgUserId)
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        DB::table('orders')
            ->where('order_id', $id)
            ->where('organization_id', $orgUserId)
            ->update([
                'receiver_name' => $data['receiver_name'],
                'receiver_contact' => $data['receiver_contact'],
                'receiver_email' => $data['receiver_email'] ?? null,
                'receiver_address' => $data['receiver_address'],
                'receiver_lat' => $data['receiver_lat'] ?? null,
                'receiver_lng' => $data['receiver_lng'] ?? null,
            ]);

        return response()->json(['message' => 'Receiver information updated successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function update(Request $request, int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        // Currently supports updating status (same validation as updateStatus)
        $data = $request->all();
        $validator = Validator::make($data, [
            'status' => 'sometimes|string|in:pending,processing,fulfilled,canceled',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Get old status before updating
        $order = DB::table('orders')
            ->where('order_id', $id)
            ->where('organization_id', $orgUserId)
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $updates = [];
        if (array_key_exists('status', $data)) {
            $updates['order_status'] = $data['status'];
        }
        if (empty($updates)) {
            return response()->json(['message' => 'No changes provided'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $oldStatus = $order->order_status;

        DB::table('orders')
            ->where('order_id', $id)
            ->where('organization_id', $orgUserId)
            ->update($updates);

        // Broadcast real-time status update if status was changed
        if (array_key_exists('order_status', $updates)) {
            $orderModel = Order::find($id);
            if ($orderModel) {
                \Log::info('Broadcasting order status update', [
                    'order_id' => $id,
                    'old_status' => $oldStatus,
                    'new_status' => $updates['order_status'],
                    'organization_id' => $orderModel->organization_id ?? null
                ]);
                event(new OrderStatusUpdated($orderModel, $oldStatus, $updates['order_status'], 'admin'));
                \Log::info('Order broadcast event fired');
            }
        }

        return response()->json(['message' => 'Order updated'])
            ->header('Access-Control-Allow-Origin', '*');
    }



}
