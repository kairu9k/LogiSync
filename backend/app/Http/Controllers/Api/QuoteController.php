<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\UserHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;

class QuoteController extends Controller
{
    private function calculateCost(int $weightKg, array $dimsCm, int $distanceKm, string $destination = 'standard'): int
    {
        // Get pricing configuration from database
        $config = DB::table('pricing_config')->first();

        // Fallback to default values if config not found
        if (!$config) {
            $config = (object)[
                'base_rate' => 100.00,
                'per_km_rate' => 15.00,
                'per_kg_rate' => 5.00,
                'fuel_surcharge_percent' => 10.00,
                'insurance_percent' => 2.00,
                'minimum_charge' => 200.00,
                'priority_multiplier' => 1.50,
                'express_multiplier' => 2.00,
            ];
        }

        // Calculate volumetric weight (L*W*H)/5000, use higher of actual vs volumetric
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

        // Calculate base cost
        $baseCost = (float) $config->base_rate;
        $distanceCost = $distanceKm * (float) $config->per_km_rate;
        $weightCost = $chargeableWeight * (float) $config->per_kg_rate;
        $subtotal = $baseCost + $distanceCost + $weightCost;

        // Apply surcharges
        $fuelSurcharge = $subtotal * ((float) $config->fuel_surcharge_percent / 100);
        $insurance = $subtotal * ((float) $config->insurance_percent / 100);
        $totalBeforeMultiplier = $subtotal + $fuelSurcharge + $insurance;

        // Apply service type multiplier (destination-based)
        $multiplier = match (strtolower($destination)) {
            'remote' => (float) $config->express_multiplier, // Remote areas (provinces, islands)
            'standard' => (float) $config->priority_multiplier, // Standard destinations
            default => (float) $config->priority_multiplier, // Default to standard
        };

        $total = $totalBeforeMultiplier * $multiplier;

        // Apply minimum charge
        $finalTotal = max($total, (float) $config->minimum_charge);

        return (int) round($finalTotal * 100); // in cents (₱ to centavos)
    }

    public function index(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $status = $request->query('status');
        $query = DB::table('quotes as q')
            ->leftJoin('users as creator', 'q.created_by_user_id', '=', 'creator.user_id')
            ->leftJoin('orders as o', 'o.quote_id', '=', 'q.quote_id')
            ->where('q.organization_id', $orgUserId)
            ->select(
                'q.quote_id','q.quote_number','q.creation_date','q.organization_id','q.weight','q.dimensions','q.distance','q.estimated_cost','q.expiry_date','q.status',
                'q.customer_name',
                'creator.username as created_by_username',
                DB::raw('MIN(o.order_id) as order_id')
            )
            ->groupBy('q.quote_id','q.quote_number','q.creation_date','q.organization_id','q.weight','q.dimensions','q.distance','q.estimated_cost','q.expiry_date','q.status','q.customer_name','creator.username')
            ->orderByDesc('q.creation_date');
        if ($status && $status !== 'any') $query->where('q.status', $status);
        $rows = $query->limit(100)->get();
        $data = $rows->map(function ($r) {
            return [
                'id' => (int) $r->quote_id,
                'quote_number' => $r->quote_number,
                'customer' => $r->customer_name ?? 'N/A',
                'created_by' => $r->created_by_username ?? 'System',
                'weight' => (int) $r->weight,
                'dimensions' => $r->dimensions,
                'distance' => (int) $r->distance,
                'estimated_cost' => (int) $r->estimated_cost,
                'expiry_date' => $r->expiry_date,
                'status' => $r->status,
                'order_id' => $r->order_id ? (int) $r->order_id : null,
                'converted' => $r->order_id !== null,
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
            'currency' => 'PHP',
            'expiry_date' => Carbon::now()->addDays(14)->toDateString(),
        ])->header('Access-Control-Allow-Origin', '*');
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
            'customer' => 'required|string|max:255',
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

        // Get the creator (logged-in user who created the quote)
        $createdByUserId = $userId;

        $dims = [ 'L' => (float)$data['L'], 'W' => (float)$data['W'], 'H' => (float)$data['H'] ];
        $cost = $this->calculateCost((int)$data['weight'], $dims, (int)$data['distance'], $data['destination'] ?? 'standard');
        $expiry = Carbon::now()->addDays(14)->toDateString();

        // Generate unique quote number
        $quoteNumber = UserHelper::generateQuoteNumber();

        $id = DB::table('quotes')->insertGetId([
            'user_id' => $orgUserId,
            'quote_number' => $quoteNumber,
            'customer_name' => $data['customer'],
            'created_by_user_id' => $createdByUserId,
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
            'quote_number' => $quoteNumber,
            'estimated_cost' => $cost,
            'expiry_date' => $expiry,
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
            'status' => 'required|string|in:pending,approved,rejected,expired',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }
        $exists = DB::table('quotes')
            ->where('quote_id', $id)
            ->where('organization_id', $orgUserId)
            ->exists();
        if (!$exists) return response()->json(['message' => 'Quote not found'], 404)->header('Access-Control-Allow-Origin','*');
        DB::table('quotes')
            ->where('quote_id', $id)
            ->where('organization_id', $orgUserId)
            ->update(['status' => $data['status']]);
        return response()->json(['message' => 'Quote status updated'])->header('Access-Control-Allow-Origin','*');
    }

    public function convertToOrder(int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $q = DB::table('quotes')
            ->where('quote_id', $id)
            ->where('organization_id', $orgUserId)
            ->first();
        if (!$q) return response()->json(['message' => 'Quote not found'], 404)->header('Access-Control-Allow-Origin','*');
        // If expired, block conversion
        if ($q->expiry_date && Carbon::parse($q->expiry_date)->isPast()) {
            return response()->json(['message' => 'Quote expired'], 400)->header('Access-Control-Allow-Origin','*');
        }
        // Use the authenticated user_id
        $userId = $q->user_id;
        $orderPayload = [
            'user_id' => $userId,
            'order_status' => 'pending',
        ];
        // Copy customer name from quote
        if (Schema::hasColumn('orders', 'customer_name') && !empty($q->customer_name)) {
            $orderPayload['customer_name'] = $q->customer_name;
        }
        // Be resilient if migration not applied yet
        if (Schema::hasColumn('orders', 'quote_id')) {
            $orderPayload['quote_id'] = $q->quote_id;
        }
        $orderId = DB::table('orders')->insertGetId($orderPayload, 'order_id');
        // Optionally, we could translate dims/weight to order_details; keeping minimal here
        // Mark quote approved if not already
        if ($q->status !== 'approved') {
            DB::table('quotes')->where('quote_id', $id)->update(['status' => 'approved']);
        }
        return response()->json(['message' => 'Order created', 'order_id' => $orderId])
            ->header('Access-Control-Allow-Origin','*');
    }
}
