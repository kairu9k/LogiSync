<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        // Basic listing with optional status filter and search by PO (order_id) or username
        $status = $request->query('status');
        $search = $request->query('q');
        $limit = (int) ($request->query('limit', 20));
        $limit = max(1, min($limit, 100));

        $query = DB::table('orders as o')
            ->leftJoin('users as u', 'o.user_id', '=', 'u.user_id')
            ->leftJoin('order_details as od', 'o.order_id', '=', 'od.order_id')
            ->select(
                'o.order_id',
                'o.order_status',
                'o.order_date',
                'u.username',
                DB::raw('COUNT(od.order_details_id) as items')
            )
            ->groupBy('o.order_id', 'o.order_status', 'o.order_date', 'u.username')
            ->orderByDesc('o.order_date');

        if ($status && $status !== 'any') {
            $query->where('o.order_status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $numeric = (int) preg_replace('/[^0-9]/', '', $search);
                $q->where('u.username', 'like', "%$search%")
                  ->orWhere('o.order_id', $numeric);
            });
        }

        $rows = $query->limit($limit)->get();

        $data = $rows->map(function ($row) {
            return [
                'id' => (int) $row->order_id,
                'po' => 'PO-' . str_pad((string) $row->order_id, 5, '0', STR_PAD_LEFT),
                'customer' => $row->username ?? 'N/A',
                'items' => (int) $row->items,
                'status' => $row->order_status,
                'order_date' => $row->order_date,
            ];
        });

        return response()->json([
            'data' => $data,
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function show(int $id)
    {
        $row = DB::table('orders as o')
            ->leftJoin('users as u', 'o.user_id', '=', 'u.user_id')
            ->select('o.order_id','o.order_status','o.order_date','u.username')
            ->where('o.order_id', $id)
            ->first();

        if (!$row) {
            return response()->json(['message' => 'Order not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $details = DB::table('order_details')->where('order_id', $id)
            ->select('order_details_id','product_id','quantity')
            ->get();

        $data = [
            'id' => (int) $row->order_id,
            'po' => 'PO-' . str_pad((string) $row->order_id, 5, '0', STR_PAD_LEFT),
            'customer' => $row->username ?? 'N/A',
            'status' => $row->order_status,
            'order_date' => $row->order_date,
            'items' => (int) ($details->sum('quantity') ?? 0),
            'details' => $details,
        ];

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'customer' => 'nullable|string|max:255',
            'user_id' => 'nullable|integer',
            'status' => 'nullable|string|in:pending,processing,fulfilled,canceled',
            'items' => 'sometimes|array',
            'items.*.product_id' => 'required_with:items|integer',
            'items.*.quantity' => 'required_with:items|integer|min:1',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Resolve or create a user
        $userId = $data['user_id'] ?? (DB::table('users')->min('user_id') ?? null);
        if (!$userId) {
            $userId = DB::table('users')->insertGetId([
                'username' => $data['customer'] ?? 'demo',
                'password' => bcrypt('password'),
                'role' => 'admin',
                'email' => ($data['customer'] ?? 'demo') . '@example.com',
            ], 'user_id');
        }

        $status = $data['status'] ?? 'pending';

        $id = DB::table('orders')->insertGetId([
            'user_id' => $userId,
            'order_status' => $status,
        ], 'order_id');

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
        $data = $request->all();
        $validator = Validator::make($data, [
            'status' => 'required|string|in:pending,processing,fulfilled,canceled',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $exists = DB::table('orders')->where('order_id', $id)->exists();
        if (!$exists) {
            return response()->json(['message' => 'Order not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        DB::table('orders')->where('order_id', $id)->update([
            'order_status' => $data['status'],
        ]);

        return response()->json(['message' => 'Status updated'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function addItems(Request $request, int $id)
    {
        // Accept either items[] or a single product_id + quantity
        $data = $request->all();

        $exists = DB::table('orders')->where('order_id', $id)->exists();
        if (!$exists) {
            return response()->json(['message' => 'Order not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $rules = [
            'items' => 'sometimes|array|min:1',
            'items.*.product_id' => 'required_with:items|integer',
            'items.*.quantity' => 'required_with:items|integer|min:1',
            'product_id' => 'sometimes|integer',
            'quantity' => 'sometimes|integer|min:1',
        ];
        $validator = Validator::make($data, $rules);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $rows = [];
        if (!empty($data['items']) && is_array($data['items'])) {
            foreach ($data['items'] as $it) {
                if (!isset($it['product_id']) || !isset($it['quantity'])) continue;
                $rows[] = [
                    'order_id' => $id,
                    'product_id' => (int) $it['product_id'],
                    'quantity' => (int) $it['quantity'],
                ];
            }
        } elseif (isset($data['product_id'], $data['quantity'])) {
            $rows[] = [
                'order_id' => $id,
                'product_id' => (int) $data['product_id'],
                'quantity' => (int) $data['quantity'],
            ];
        }

        if (empty($rows)) {
            return response()->json(['message' => 'No items to add'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        DB::table('order_details')->insert($rows);

        return response()->json(['message' => 'Items added', 'count' => count($rows)])
            ->header('Access-Control-Allow-Origin', '*');
    }
}
