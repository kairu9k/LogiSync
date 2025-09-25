<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;

class QuoteController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'customer' => 'nullable|string|max:255',
            'origin' => 'nullable|string|max:255',
            'destination' => 'nullable|string|max:255',
            'items' => 'nullable|string',
            'price' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'user_id' => 'nullable|integer',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $userId = $data['user_id'] ?? (DB::table('users')->min('user_id') ?? null);
        if (!$userId) {
            // Autocreate a minimal user to satisfy FK
            $userId = DB::table('users')->insertGetId([
                'username' => 'demo',
                'password' => bcrypt('password'),
                'role' => 'admin',
                'email' => 'demo@example.com',
            ], 'user_id');
        }

        $id = DB::table('quotes')->insertGetId([
            'user_id' => $userId,
            'weight' => 0,
            'dimensions' => $data['items'] ?? 'N/A',
            'estimated_cost' => isset($data['price']) ? (int)round($data['price'] * 100) : 0,
            'expiry_date' => Carbon::now()->addDays(14)->toDateString(),
            'status' => 'pending',
            'distance' => 0,
        ], 'quote_id');

        return response()->json([
            'message' => 'Quote created',
            'quote_id' => $id,
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }
}