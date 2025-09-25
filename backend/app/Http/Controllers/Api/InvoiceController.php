<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class InvoiceController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'customer' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'required|date',
            'ref' => 'nullable|string|max:255',
            'order_id' => 'nullable|integer',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $orderId = $data['order_id'] ?? null;
        if (!$orderId || !DB::table('orders')->where('order_id', $orderId)->exists()) {
            // Ensure there is a user to attach; fallback to 1
            $userId = DB::table('users')->min('user_id') ?? 1;
            $orderId = DB::table('orders')->insertGetId([
                'user_id' => $userId,
                'order_status' => 'pending',
            ], 'order_id');
        }

        $id = DB::table('invoices')->insertGetId([
            'order_id' => $orderId,
            'invoice_type' => 'standard',
            'invoice_date' => Carbon::now()->toDateString(),
            'due_date' => Carbon::parse($data['due_date'])->toDateString(),
            'amount' => (int)round($data['amount'] * 100),
            'status' => 'pending',
        ], 'invoice_id');

        return response()->json([
            'message' => 'Invoice created',
            'invoice_id' => $id,
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }
}