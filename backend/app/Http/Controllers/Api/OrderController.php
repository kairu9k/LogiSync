<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        if ($status) {
            $query->where('o.order_status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('u.username', 'like', "%$search%")
                  ->orWhere('o.order_id', (int) preg_replace('/[^0-9]/', '', $search));
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
}