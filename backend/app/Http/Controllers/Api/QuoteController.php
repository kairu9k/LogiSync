<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;

class QuoteController extends Controller
{
    private function calculateCost(int $weightKg, array $dimsCm, int $distanceKm, string $destination = 'standard'): int
    {
        // Pricing rules:
        // - Base per km: $0.50/km
        // - Weight component: $0.20/kg per 100 km
        // - Volumetric weight: (L*W*H)/5000, use higher of actual vs volumetric
        // - Destination multiplier: international 1.5, remote 1.3, standard 1.0
        // - Minimum charge: $15
        // - Markup: +15%
        $basePerKm = 0.50; // USD per km
        $weightPer100Km = 0.20; // USD per kg per 100 km
        $minCharge = 15.0;
        $mult = match (strtolower($destination)) {
            'international' => 1.5,
            'remote' => 1.3,
            default => 1.0,
        };

        $volumetric = 0.0;
        if (!empty($dimsCm)) {
            $L = (float)($dimsCm['L'] ?? 0);
            $W = (float)($dimsCm['W'] ?? 0);
            $H = (float)($dimsCm['H'] ?? 0);
            if ($L > 0 && $W > 0 && $H > 0) {
                $volumetric = ($L * $W * $H) / 5000.0; // kg
            }
        }
        $chargeableWeight = max($weightKg, $volumetric);

        $distanceCost = $distanceKm * $basePerKm;
        $weightCost = ($distanceKm / 100.0) * $weightPer100Km * $chargeableWeight;
        $raw = ($distanceCost + $weightCost) * $mult;
        $raw = max($raw, $minCharge);
        $withMarkup = $raw * 1.15; // 15%

        return (int) round($withMarkup * 100); // in cents
    }

    public function index(Request $request)
    {
        $status = $request->query('status');
        $query = DB::table('quotes as q')
            ->leftJoin('users as u', 'q.user_id', '=', 'u.user_id')
            ->select('q.quote_id','q.creation_date','q.user_id','q.weight','q.dimensions','q.distance','q.estimated_cost','q.expiry_date','q.status','u.username')
            ->orderByDesc('q.creation_date');
        if ($status && $status !== 'any') $query->where('q.status', $status);
        $rows = $query->limit(100)->get();
        $data = $rows->map(function ($r) {
            return [
                'id' => (int) $r->quote_id,
                'customer' => $r->username ?? 'N/A',
                'weight' => (int) $r->weight,
                'dimensions' => $r->dimensions,
                'distance' => (int) $r->distance,
                'estimated_cost' => (int) $r->estimated_cost,
                'expiry_date' => $r->expiry_date,
                'status' => $r->status,
            ];
        });
        return response()->json(['data' => $data])->header('Access-Control-Allow-Origin', '*');
    }

    public function calculate(Request $request)
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'weight' => 'required|integer|min:0',
            'L' => 'required|numeric|min:0',
            'W' => 'required|numeric|min:0',
            'H' => 'required|numeric|min:0',
            'distance' => 'required|integer|min:0',
            'destination' => 'nullable|string',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }
        $cents = $this->calculateCost((int)$data['weight'], [
            'L' => (float)$data['L'],
            'W' => (float)$data['W'],
            'H' => (float)$data['H'],
        ], (int)$data['distance'], $data['destination'] ?? 'standard');
        return response()->json([
            'amount_cents' => $cents,
            'amount' => round($cents / 100, 2),
            'currency' => 'USD',
            'expiry_date' => Carbon::now()->addDays(14)->toDateString(),
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'user_id' => 'nullable|integer',
            'customer' => 'nullable|string|max:255',
            'destination' => 'nullable|string',
            'weight' => 'required|integer|min:0',
            'L' => 'required|numeric|min:0',
            'W' => 'required|numeric|min:0',
            'H' => 'required|numeric|min:0',
            'distance' => 'required|integer|min:0',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $userId = $data['user_id'] ?? (DB::table('users')->min('user_id') ?? null);
        if (!$userId) {
            $userId = DB::table('users')->insertGetId([
                'username' => $data['customer'] ?? 'demo',
                'password' => bcrypt('password'),
                'role' => 'admin',
                'email' => ($data['customer'] ?? 'demo') . '@example.com',
            ], 'user_id');
        }

        $dims = [ 'L' => (float)$data['L'], 'W' => (float)$data['W'], 'H' => (float)$data['H'] ];
        $cost = $this->calculateCost((int)$data['weight'], $dims, (int)$data['distance'], $data['destination'] ?? 'standard');
        $expiry = Carbon::now()->addDays(14)->toDateString();

        $id = DB::table('quotes')->insertGetId([
            'user_id' => $userId,
            'weight' => (int)$data['weight'],
            'dimensions' => json_encode($dims),
            'estimated_cost' => $cost,
            'expiry_date' => $expiry,
            'status' => 'pending',
            'distance' => (int)$data['distance'],
        ], 'quote_id');

        return response()->json([
            'message' => 'Quote created',
            'quote_id' => $id,
            'estimated_cost' => $cost,
            'expiry_date' => $expiry,
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }

    public function updateStatus(Request $request, int $id)
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'status' => 'required|string|in:pending,approved,rejected,expired',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }
        $exists = DB::table('quotes')->where('quote_id', $id)->exists();
        if (!$exists) return response()->json(['message' => 'Quote not found'], 404)->header('Access-Control-Allow-Origin','*');
        DB::table('quotes')->where('quote_id', $id)->update(['status' => $data['status']]);
        return response()->json(['message' => 'Quote status updated'])->header('Access-Control-Allow-Origin','*');
    }

    public function convertToOrder(int $id)
    {
        $q = DB::table('quotes')->where('quote_id', $id)->first();
        if (!$q) return response()->json(['message' => 'Quote not found'], 404)->header('Access-Control-Allow-Origin','*');
        // If expired, block conversion
        if ($q->expiry_date && Carbon::parse($q->expiry_date)->isPast()) {
            return response()->json(['message' => 'Quote expired'], 400)->header('Access-Control-Allow-Origin','*');
        }
        // Ensure there is a user
        $userId = $q->user_id ?? (DB::table('users')->min('user_id') ?? 1);
        $orderId = DB::table('orders')->insertGetId([
            'user_id' => $userId,
            'quote_id' => $q->quote_id,
            'order_status' => 'pending',
        ], 'order_id');
        // Optionally, we could translate dims/weight to order_details; keeping minimal here
        // Mark quote approved if not already
        if ($q->status !== 'approved') {
            DB::table('quotes')->where('quote_id', $id)->update(['status' => 'approved']);
        }
        return response()->json(['message' => 'Order created', 'order_id' => $orderId])
            ->header('Access-Control-Allow-Origin','*');
    }
}
