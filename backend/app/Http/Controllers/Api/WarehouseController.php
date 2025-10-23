<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Warehouse;
use App\Models\Inventory;
use App\Models\OrderDetail;
use App\Helpers\UserHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class WarehouseController extends Controller
{
    public function index(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        // Get organization user ID (admin's ID for team members, own ID for admins)
        $orgUserId = UserHelper::getOrganizationUserId($userId);

        $search = $request->query('search');
        $limit = (int) ($request->query('limit', 20));
        $limit = max(1, min($limit, 100));

        $query = Warehouse::with(['inventory.order.organization'])->where('organization_id', $orgUserId);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('warehouse_name', 'like', "%$search%")
                  ->orWhere('location', 'like', "%$search%");
            });
        }

        $warehouses = $query->limit($limit)->get();

        $data = $warehouses->map(function ($warehouse) {
            return [
                'id' => $warehouse->warehouse_id,
                'name' => $warehouse->warehouse_name,
                'location' => $warehouse->location,
                'inventory_count' => $warehouse->inventory_count,
                'available_space' => $warehouse->available_space,
                'utilization_percentage' => $warehouse->inventory_count > 0
                    ? round(($warehouse->inventory_count / 1000) * 100, 1)
                    : 0,
                'status' => $warehouse->available_space <= 50 ? 'near_capacity' : 'available',
            ];
        });

        // Get stats filtered by organization
        $stats = Warehouse::getWarehouseStats($orgUserId);

        return response()->json([
            'data' => $data,
            'stats' => $stats,
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function show(int $id)
    {
        $warehouse = Warehouse::with(['inventory.order.organization', 'inventory.order.quote'])->find($id);

        if (!$warehouse) {
            return response()->json(['message' => 'Warehouse not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $inventoryItems = $warehouse->inventory->map(function ($item) {
            $details = $item->full_details;
            $order = $item->order;
            $quote = $order ? $order->quote : null;

            return [
                'inventory_id' => $details['inventory_id'],
                'location' => $details['location'],
                'po' => $details['po'],
                'order_id' => $details['order_id'],
                'order_status' => $details['order_status'],
                'customer' => $details['customer'],
                'order_date' => $details['order_date'],
                'storage_date' => $item->created_at ?? null,
                // Package information from quote
                'weight' => $quote ? $quote->weight : null,
                'dimensions' => $quote ? $quote->dimensions : null,
                'distance' => $quote ? $quote->distance : null,
            ];
        });

        $data = [
            'id' => $warehouse->warehouse_id,
            'name' => $warehouse->warehouse_name,
            'location' => $warehouse->location,
            'inventory_count' => $warehouse->inventory_count,
            'available_space' => $warehouse->available_space,
            'utilization_percentage' => $warehouse->inventory_count > 0
                ? round(($warehouse->inventory_count / 1000) * 100, 1)
                : 0,
            'inventory_items' => $inventoryItems,
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

        // Get organization user ID (admin's ID for team members, own ID for admins)
        $orgUserId = UserHelper::getOrganizationUserId($userId);

        $data = $request->all();
        $validator = Validator::make($data, [
            'warehouse_name' => 'required|string|max:255',
            'location' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $data['organization_id'] = $orgUserId;
        $warehouse = Warehouse::create($data);

        return response()->json([
            'message' => 'Warehouse created successfully',
            'warehouse_id' => $warehouse->warehouse_id,
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }

    public function update(Request $request, int $id)
    {
        $warehouse = Warehouse::find($id);
        if (!$warehouse) {
            return response()->json(['message' => 'Warehouse not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $data = $request->all();
        $validator = Validator::make($data, [
            'warehouse_name' => 'sometimes|required|string|max:255',
            'location' => 'sometimes|required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $warehouse->update($data);

        return response()->json(['message' => 'Warehouse updated successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function destroy(int $id)
    {
        $warehouse = Warehouse::find($id);
        if (!$warehouse) {
            return response()->json(['message' => 'Warehouse not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        if ($warehouse->inventory_count > 0) {
            return response()->json(['message' => 'Cannot delete warehouse with inventory items'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $warehouse->delete();

        return response()->json(['message' => 'Warehouse deleted successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function getInventory(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        // Get organization user ID (admin's ID for team members, own ID for admins)
        $orgUserId = UserHelper::getOrganizationUserId($userId);

        $search = $request->query('search');
        $status = $request->query('status');
        $warehouseId = $request->query('warehouse_id');
        $limit = (int) ($request->query('limit', 50));
        $limit = max(1, min($limit, 200));

        // Get items filtered by organization
        if ($search) {
            $items = Inventory::searchItems($search, $orgUserId);
        } else {
            if ($status) {
                $items = Inventory::getItemsByStatus($status, $orgUserId);
            } else {
                // Get all items for this organization
                $items = Inventory::with(['warehouse', 'order.organization', 'order.quote'])
                    ->whereHas('order', function ($q) use ($orgUserId) {
                        $q->where('organization_id', $orgUserId);
                    })
                    ->get();
            }
        }

        if ($warehouseId) {
            $items = $items->where('warehouse_id', $warehouseId);
        }

        $data = $items->take($limit)->map(function ($item) {
            $details = $item->full_details;
            $order = $item->order;
            $quote = $order ? $order->quote : null;

            return [
                'inventory_id' => $details['inventory_id'],
                'location' => $details['location'],
                'warehouse' => $details['warehouse'],
                'warehouse_id' => $item->warehouse_id,
                'po' => $details['po'],
                'order_id' => $details['order_id'],
                'order_status' => $details['order_status'],
                'customer' => $details['customer'],
                'order_date' => $details['order_date'],
                // Package information from quote
                'weight' => $quote ? $quote->weight : null,
                'dimensions' => $quote ? $quote->dimensions : null,
                'distance' => $quote ? $quote->distance : null,
            ];
        });

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function assignItem(Request $request)
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'order_id' => 'required|integer|exists:orders,order_id',
            'warehouse_id' => 'required|integer|exists:warehouse,warehouse_id',
            'location_in_warehouse' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Check if order is already assigned
        $existingAssignment = Inventory::where('order_id', $data['order_id'])->first();
        if ($existingAssignment) {
            return response()->json(['message' => 'Package already assigned to warehouse'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $inventory = Inventory::assignToWarehouse(
            $data['order_id'],
            $data['warehouse_id'],
            $data['location_in_warehouse']
        );

        return response()->json([
            'message' => 'Package assigned to warehouse successfully',
            'inventory_id' => $inventory->inventory_id,
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }

    public function updateItemLocation(Request $request, int $inventoryId)
    {
        $inventory = Inventory::find($inventoryId);
        if (!$inventory) {
            return response()->json(['message' => 'Inventory item not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $data = $request->all();
        $validator = Validator::make($data, [
            'warehouse_id' => 'sometimes|required|integer|exists:warehouse,warehouse_id',
            'location_in_warehouse' => 'sometimes|required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $inventory->update($data);

        return response()->json(['message' => 'Item location updated successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function getUnassignedItems()
    {
        $unassignedOrders = OrderDetail::getUnassignedItems();

        $data = $unassignedOrders->map(function ($order) {
            $quote = $order->quote;
            return [
                'order_id' => $order->order_id,
                'po' => 'PO-' . str_pad($order->order_id, 5, '0', STR_PAD_LEFT),
                'order_status' => $order->order_status,
                'customer' => $order->customer_name ?? $order->user->username ?? 'Unknown',
                'order_date' => $order->order_date,
                // Package information from quote
                'weight' => $quote ? $quote->weight : null,
                'dimensions' => $quote ? $quote->dimensions : null,
                'distance' => $quote ? $quote->distance : null,
                'estimated_cost' => $quote ? $quote->estimated_cost : null,
            ];
        });

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function getDashboardMetrics()
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        // Get organization user ID (admin's ID for team members, own ID for admins)
        $orgUserId = UserHelper::getOrganizationUserId($userId);

        // Get stats filtered by organization
        $stats = Warehouse::getWarehouseStats($orgUserId);
        $unassignedCount = OrderDetail::getUnassignedItems()->count();

        // Get recent activity filtered by organization
        $recentAssignments = Inventory::with(['warehouse', 'order.organization'])
            ->whereHas('order', function ($q) use ($orgUserId) {
                $q->where('organization_id', $orgUserId);
            })
            ->orderBy('inventory_id', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                $details = $item->full_details;
                return [
                    'po' => $details['po'],
                    'warehouse' => $details['warehouse'],
                    'location' => $details['location'],
                    'customer' => $details['customer'],
                    'order_id' => $details['order_id'],
                ];
            });

        return response()->json([
            'data' => array_merge($stats, [
                'unassigned_items' => $unassignedCount,
                'recent_assignments' => $recentAssignments,
            ])
        ])->header('Access-Control-Allow-Origin', '*');
    }
}