<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Warehouse;
use App\Models\Inventory;
use App\Models\OrderDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class WarehouseController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');
        $limit = (int) ($request->query('limit', 20));
        $limit = max(1, min($limit, 100));

        $query = Warehouse::with(['inventory.orderDetail.order.user']);

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

        $stats = Warehouse::getWarehouseStats();

        return response()->json([
            'data' => $data,
            'stats' => $stats,
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function show(int $id)
    {
        $warehouse = Warehouse::with(['inventory.orderDetail.order.user'])->find($id);

        if (!$warehouse) {
            return response()->json(['message' => 'Warehouse not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $inventoryItems = $warehouse->inventory->map(function ($item) {
            $details = $item->full_details;
            return [
                'inventory_id' => $details['inventory_id'],
                'location' => $details['location'],
                'product_id' => $details['product_id'],
                'formatted_product_id' => 'PROD-' . str_pad((string) $details['product_id'], 4, '0', STR_PAD_LEFT),
                'quantity' => $details['quantity'],
                'order_id' => $details['order_id'],
                'order_status' => $details['order_status'],
                'customer' => $details['customer'],
                'order_date' => $details['order_date'],
                'storage_date' => $item->created_at ?? null,
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
        $data = $request->all();
        $validator = Validator::make($data, [
            'warehouse_name' => 'required|string|max:255',
            'location' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

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
        $search = $request->query('search');
        $status = $request->query('status');
        $warehouseId = $request->query('warehouse_id');
        $limit = (int) ($request->query('limit', 50));
        $limit = max(1, min($limit, 200));

        $query = Inventory::with(['warehouse', 'orderDetail.order.user']);

        if ($search) {
            $items = Inventory::searchItems($search);
        } else {
            if ($status) {
                $items = Inventory::getItemsByStatus($status);
            } else {
                $items = $query->get();
            }
        }

        if ($warehouseId) {
            $items = $items->where('warehouse_id', $warehouseId);
        }

        $data = $items->take($limit)->map(function ($item) {
            $details = $item->full_details;
            return [
                'inventory_id' => $details['inventory_id'],
                'location' => $details['location'],
                'warehouse' => $details['warehouse'],
                'warehouse_id' => $item->warehouse_id,
                'product_id' => $details['product_id'],
                'formatted_product_id' => 'PROD-' . str_pad((string) $details['product_id'], 4, '0', STR_PAD_LEFT),
                'quantity' => $details['quantity'],
                'order_id' => $details['order_id'],
                'order_status' => $details['order_status'],
                'customer' => $details['customer'],
                'order_date' => $details['order_date'],
            ];
        });

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function assignItem(Request $request)
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'order_details_id' => 'required|integer|exists:order_details,order_details_id',
            'warehouse_id' => 'required|integer|exists:warehouse,warehouse_id',
            'location_in_warehouse' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Check if item is already assigned
        $existingAssignment = Inventory::where('order_details_id', $data['order_details_id'])->first();
        if ($existingAssignment) {
            return response()->json(['message' => 'Item already assigned to warehouse'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $inventory = Inventory::assignToWarehouse(
            $data['order_details_id'],
            $data['warehouse_id'],
            $data['location_in_warehouse']
        );

        return response()->json([
            'message' => 'Item assigned to warehouse successfully',
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
        $unassignedItems = OrderDetail::getUnassignedItems();

        $data = $unassignedItems->map(function ($item) {
            return [
                'order_details_id' => $item->order_details_id,
                'order_id' => $item->order_id,
                'product_id' => $item->product_id,
                'formatted_product_id' => $item->formatted_product_id,
                'quantity' => $item->quantity,
                'order_status' => $item->order->order_status,
                'customer' => $item->order->user->username ?? 'Unknown',
                'order_date' => $item->order->order_date,
                'status' => $item->status,
            ];
        });

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function getDashboardMetrics()
    {
        $stats = Warehouse::getWarehouseStats();
        $unassignedCount = OrderDetail::getUnassignedItems()->count();

        // Get recent activity
        $recentAssignments = Inventory::with(['warehouse', 'orderDetail.order.user'])
            ->orderBy('inventory_id', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                $details = $item->full_details;
                return [
                    'product_id' => 'PROD-' . str_pad((string) $details['product_id'], 4, '0', STR_PAD_LEFT),
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