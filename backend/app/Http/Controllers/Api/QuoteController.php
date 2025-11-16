<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\UserHelper;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;

class QuoteController extends Controller
{
    private function calculateCost(int $weightKg, array $dimsCm, string $deliveryZone = 'within_city'): int
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

        // Map delivery zone to average distance for Mindanao local delivery
        $estimatedDistance = match (strtolower($deliveryZone)) {
            'within_city' => 10, // 0-20km, use midpoint 10km
            'nearby_city' => 35, // 20-50km, use midpoint 35km
            'far_city' => 75, // 50-100km, use midpoint 75km
            'regional' => 150, // 100+km, use 150km
            default => 10, // Default to within city
        };

        // Calculate base cost
        $baseCost = (float) $config->base_rate;
        $distanceCost = $estimatedDistance * (float) $config->per_km_rate;
        $weightCost = $chargeableWeight * (float) $config->per_kg_rate;
        $subtotal = $baseCost + $distanceCost + $weightCost;

        // Apply surcharges
        $fuelSurcharge = $subtotal * ((float) $config->fuel_surcharge_percent / 100);
        $insurance = $subtotal * ((float) $config->insurance_percent / 100);
        $totalBeforeMultiplier = $subtotal + $fuelSurcharge + $insurance;

        // Apply multiplier based on zone (farther zones cost more)
        $multiplier = match (strtolower($deliveryZone)) {
            'within_city' => 1.0, // No multiplier for local
            'nearby_city' => 1.2, // 20% more for nearby
            'far_city' => 1.5, // 50% more for far
            'regional' => 2.0, // 2x for regional
            default => 1.0,
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
                'q.quote_id','q.quote_number','q.creation_date','q.organization_id','q.weight','q.dimensions','q.estimated_cost','q.expiry_date','q.status',
                'q.customer_name','q.items','q.delivery_zone','q.package_type',
                'creator.username as created_by_username',
                DB::raw('MIN(o.order_id) as order_id')
            )
            ->groupBy('q.quote_id','q.quote_number','q.creation_date','q.organization_id','q.weight','q.dimensions','q.estimated_cost','q.expiry_date','q.status','q.customer_name','q.items','q.delivery_zone','q.package_type','creator.username')
            ->orderByDesc('q.creation_date');
        if ($status && $status !== 'any') $query->where('q.status', $status);
        $rows = $query->limit(100)->get();
        $data = $rows->map(function ($r) {
            $isApproved = $r->status === 'approved';
            return [
                'id' => (int) $r->quote_id,
                'quote_number' => $r->quote_number,
                'customer' => $r->customer_name ?? 'N/A',
                'created_by' => $r->created_by_username ?? 'System',
                'weight' => (int) $r->weight,
                'dimensions' => $r->dimensions,
                'items' => (int) ($r->items ?? 0),
                'delivery_zone' => $r->delivery_zone ?? 'within_city',
                'package_type' => $r->package_type ?? 'standard',
                'estimated_cost' => (int) $r->estimated_cost,
                'cost_label' => $isApproved ? 'Actual Cost' : 'Estimated Cost', // NEW
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
            'items' => 'nullable|integer|min:0',
            'delivery_zone' => 'nullable|string|in:within_city,nearby_city,far_city,regional',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }
        $cents = $this->calculateCost((int)$data['weight'], [
            'L' => (float)$data['L'],
            'W' => (float)$data['W'],
            'H' => (float)$data['H'],
        ], $data['delivery_zone'] ?? 'within_city');
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
            'weight' => 'required|integer|min:0',
            'L' => 'required|numeric|min:0',
            'W' => 'required|numeric|min:0',
            'H' => 'required|numeric|min:0',
            'items' => 'nullable|integer|min:0',
            'delivery_zone' => 'nullable|string|in:within_city,nearby_city,far_city,regional',
            'package_type' => 'nullable|string|max:100',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Get the creator (logged-in user who created the quote)
        $createdByUserId = $userId;

        $dims = [ 'L' => (float)$data['L'], 'W' => (float)$data['W'], 'H' => (float)$data['H'] ];
        $cost = $this->calculateCost((int)$data['weight'], $dims, $data['delivery_zone'] ?? 'within_city');
        $expiry = Carbon::now()->addDays(14)->toDateString();

        // Generate unique quote number
        $quoteNumber = UserHelper::generateQuoteNumber();

        $id = DB::table('quotes')->insertGetId([
            'organization_id' => $orgUserId,
            'quote_number' => $quoteNumber,
            'customer_name' => $data['customer'],
            'created_by_user_id' => $createdByUserId,
            'weight' => (int)$data['weight'],
            'dimensions' => json_encode($dims),
            'estimated_cost' => $cost,
            'expiry_date' => $expiry,
            'status' => 'pending',
            'items' => (int)($data['items'] ?? 0),
            'delivery_zone' => $data['delivery_zone'] ?? 'within_city',
            'package_type' => $data['package_type'] ?? 'standard',
        ], 'quote_id');

        // Create notification for new quote request
        Notification::create([
            'organization_id' => $orgUserId,
            'user_id' => null,
            'type' => 'info',
            'category' => 'quote',
            'icon' => '📋',
            'message' => "New quote request from {$data['customer']} - {$quoteNumber}",
            'link' => "/app/quotes",
            'priority' => 'medium',
            'related_id' => $id,
        ]);

        return response()->json([
            'message' => 'Quote created',
            'quote_id' => $id,
            'quote_number' => $quoteNumber,
            'estimated_cost' => $cost,
            'expiry_date' => $expiry,
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }

    public function update(Request $request, int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $data = $request->all();
        $validator = Validator::make($data, [
            'weight' => 'required|integer|min:0',
            'L' => 'required|numeric|min:0',
            'W' => 'required|numeric|min:0',
            'H' => 'required|numeric|min:0',
            'items' => 'nullable|integer|min:0',
            'delivery_zone' => 'nullable|string|in:within_city,nearby_city,far_city,regional',
            'package_type' => 'nullable|string|max:100',
            'estimated_cost' => 'required|integer|min:0', // in cents
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $quote = DB::table('quotes')
            ->where('quote_id', $id)
            ->where('organization_id', $orgUserId)
            ->first();
        if (!$quote) return response()->json(['message' => 'Quote not found'], 404)->header('Access-Control-Allow-Origin','*');

        // Only allow editing pending quotes
        if ($quote->status !== 'pending') {
            return response()->json(['message' => 'Only pending quotes can be edited'], 400)->header('Access-Control-Allow-Origin','*');
        }

        $dims = [ 'L' => (float)$data['L'], 'W' => (float)$data['W'], 'H' => (float)$data['H'] ];

        DB::table('quotes')
            ->where('quote_id', $id)
            ->where('organization_id', $orgUserId)
            ->update([
                'weight' => (int)$data['weight'],
                'dimensions' => json_encode($dims),
                'items' => (int)($data['items'] ?? 0),
                'delivery_zone' => $data['delivery_zone'] ?? 'within_city',
                'package_type' => $data['package_type'] ?? 'Standard',
                'estimated_cost' => (int)$data['estimated_cost'],
            ]);

        // Create notification for quote update
        Notification::create([
            'organization_id' => $orgUserId,
            'user_id' => null,
            'type' => 'info',
            'category' => 'quote',
            'icon' => '✏️',
            'message' => "Quote {$quote->quote_number} for {$quote->customer_name} has been updated",
            'link' => "/app/quotes",
            'priority' => 'low',
            'related_id' => $id,
        ]);

        return response()->json(['message' => 'Quote updated successfully'])->header('Access-Control-Allow-Origin','*');
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
        $quote = DB::table('quotes')
            ->where('quote_id', $id)
            ->where('organization_id', $orgUserId)
            ->first();
        if (!$quote) return response()->json(['message' => 'Quote not found'], 404)->header('Access-Control-Allow-Origin','*');

        DB::table('quotes')
            ->where('quote_id', $id)
            ->where('organization_id', $orgUserId)
            ->update(['status' => $data['status']]);

        // Create notification for quote status change
        $notificationData = $this->getQuoteStatusNotificationData($data['status'], $quote);
        if ($notificationData) {
            Notification::create([
                'organization_id' => $orgUserId,
                'user_id' => null,
                'type' => $notificationData['type'],
                'category' => 'quote',
                'icon' => $notificationData['icon'],
                'message' => $notificationData['message'],
                'link' => "/app/quotes",
                'priority' => $notificationData['priority'],
                'related_id' => $id,
            ]);
        }

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
        // Use the authenticated organization_id
        $organizationId = $q->organization_id;
        $orderPayload = [
            'organization_id' => $organizationId,
            'order_status' => 'pending',
        ];
        // Copy customer name from quote
        if (Schema::hasColumn('orders', 'customer_name') && !empty($q->customer_name)) {
            $orderPayload['customer_name'] = $q->customer_name;
        }
        // Copy package type from quote
        if (Schema::hasColumn('orders', 'package_type') && !empty($q->package_type)) {
            $orderPayload['package_type'] = $q->package_type;
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

    /**
     * Get notification data based on quote status
     */
    private function getQuoteStatusNotificationData(string $status, object $quote): ?array
    {
        switch ($status) {
            case 'approved':
                return [
                    'type' => 'success',
                    'icon' => '✅',
                    'message' => "Quote {$quote->quote_number} for {$quote->customer_name} has been approved",
                    'priority' => 'medium'
                ];
            case 'rejected':
                return [
                    'type' => 'warning',
                    'icon' => '❌',
                    'message' => "Quote {$quote->quote_number} for {$quote->customer_name} has been rejected",
                    'priority' => 'low'
                ];
            case 'expired':
                return [
                    'type' => 'warning',
                    'icon' => '⏰',
                    'message' => "Quote {$quote->quote_number} for {$quote->customer_name} has expired",
                    'priority' => 'low'
                ];
            default:
                return null;
        }
    }
}
