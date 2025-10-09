<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PricingController extends Controller
{
    public function getConfig()
    {
        $config = DB::table('pricing_config')->first();

        if (!$config) {
            return response()->json(['message' => 'Pricing configuration not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json([
            'data' => [
                'base_rate' => (float) $config->base_rate,
                'per_km_rate' => (float) $config->per_km_rate,
                'per_kg_rate' => (float) $config->per_kg_rate,
                'fuel_surcharge_percent' => (float) $config->fuel_surcharge_percent,
                'insurance_percent' => (float) $config->insurance_percent,
                'minimum_charge' => (float) $config->minimum_charge,
                'priority_multiplier' => (float) $config->priority_multiplier,
                'express_multiplier' => (float) $config->express_multiplier,
            ]
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function updateConfig(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'base_rate' => 'required|numeric|min:0',
            'per_km_rate' => 'required|numeric|min:0',
            'per_kg_rate' => 'required|numeric|min:0',
            'fuel_surcharge_percent' => 'required|numeric|min:0|max:100',
            'insurance_percent' => 'required|numeric|min:0|max:100',
            'minimum_charge' => 'required|numeric|min:0',
            'priority_multiplier' => 'required|numeric|min:1',
            'express_multiplier' => 'required|numeric|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Get the first config record (we only have one)
        $config = DB::table('pricing_config')->first();

        if ($config) {
            // Update existing config
            DB::table('pricing_config')
                ->where('config_id', $config->config_id)
                ->update([
                    'base_rate' => $request->base_rate,
                    'per_km_rate' => $request->per_km_rate,
                    'per_kg_rate' => $request->per_kg_rate,
                    'fuel_surcharge_percent' => $request->fuel_surcharge_percent,
                    'insurance_percent' => $request->insurance_percent,
                    'minimum_charge' => $request->minimum_charge,
                    'priority_multiplier' => $request->priority_multiplier,
                    'express_multiplier' => $request->express_multiplier,
                ]);
        } else {
            // Create new config
            DB::table('pricing_config')->insert([
                'base_rate' => $request->base_rate,
                'per_km_rate' => $request->per_km_rate,
                'per_kg_rate' => $request->per_kg_rate,
                'fuel_surcharge_percent' => $request->fuel_surcharge_percent,
                'insurance_percent' => $request->insurance_percent,
                'minimum_charge' => $request->minimum_charge,
                'priority_multiplier' => $request->priority_multiplier,
                'express_multiplier' => $request->express_multiplier,
            ]);
        }

        return response()->json([
            'message' => 'Pricing configuration updated successfully'
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function previewCalculation(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'distance' => 'required|numeric|min:0',
            'weight' => 'required|numeric|min:0',
            'service_type' => 'nullable|string|in:standard,priority,express',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $config = DB::table('pricing_config')->first();

        if (!$config) {
            return response()->json(['message' => 'Pricing configuration not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $distance = $request->distance;
        $weight = $request->weight;
        $serviceType = $request->service_type ?? 'standard';

        // Calculate base cost
        $baseCost = (float) $config->base_rate;
        $distanceCost = $distance * (float) $config->per_km_rate;
        $weightCost = $weight * (float) $config->per_kg_rate;
        $subtotal = $baseCost + $distanceCost + $weightCost;

        // Apply surcharges
        $fuelSurcharge = $subtotal * ((float) $config->fuel_surcharge_percent / 100);
        $insurance = $subtotal * ((float) $config->insurance_percent / 100);
        $totalBeforeMultiplier = $subtotal + $fuelSurcharge + $insurance;

        // Apply service type multiplier
        $multiplier = 1.0;
        if ($serviceType === 'priority') {
            $multiplier = (float) $config->priority_multiplier;
        } elseif ($serviceType === 'express') {
            $multiplier = (float) $config->express_multiplier;
        }

        $total = $totalBeforeMultiplier * $multiplier;

        // Apply minimum charge
        $finalTotal = max($total, (float) $config->minimum_charge);

        return response()->json([
            'data' => [
                'breakdown' => [
                    'base_rate' => round($baseCost, 2),
                    'distance_cost' => round($distanceCost, 2),
                    'weight_cost' => round($weightCost, 2),
                    'subtotal' => round($subtotal, 2),
                    'fuel_surcharge' => round($fuelSurcharge, 2),
                    'insurance' => round($insurance, 2),
                    'service_multiplier' => $multiplier,
                    'total_before_minimum' => round($total, 2),
                    'minimum_charge' => round((float) $config->minimum_charge, 2),
                    'final_total' => round($finalTotal, 2),
                ],
                'service_type' => $serviceType,
            ]
        ])->header('Access-Control-Allow-Origin', '*');
    }
}
