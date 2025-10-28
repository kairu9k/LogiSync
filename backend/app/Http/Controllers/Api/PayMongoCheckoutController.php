<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class PayMongoCheckoutController extends Controller
{
    private function callPaymongoAPI($method, $endpoint, $data = null)
    {
        $url = 'https://api.paymongo.com/v1' . $endpoint;
        $auth = base64_encode(env('PAYMONGO_SECRET_KEY') . ':');

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Basic ' . $auth,
            'Content-Type: application/json',
            'Accept: application/json'
        ]);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['data' => ['attributes' => $data]]));
            }
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 400) {
            throw new \Exception('PayMongo API Error: ' . $response);
        }

        return json_decode($response);
    }

    // Create PayMongo Checkout Session
    public function createCheckout(Request $request)
    {
        $userId = $request->header('X-User-Id');

        if (!$userId) {
            return response()->json(['message' => 'User not authenticated'], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $data = $request->all();
        $validator = Validator::make($data, [
            'plan_id' => 'required|integer|exists:subscriptions,subscription_id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $plan = DB::table('subscriptions')->where('subscription_id', $data['plan_id'])->first();

        if (!$plan || !$plan->active) {
            return response()->json(['message' => 'Plan not available'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Free plan - instant activation
        if ($plan->price == 0) {
            // Cancel any existing active subscriptions
            DB::table('user_subscriptions')
                ->where('user_id', $userId)
                ->where('status', 'active')
                ->update(['status' => 'cancelled']);

            $subscriptionId = DB::table('user_subscriptions')->insertGetId([
                'user_id' => $userId,
                'subscription_id' => $plan->subscription_id,
                'status' => 'active',
                'start_date' => Carbon::now()->toDateString(),
                'end_date' => Carbon::now()->addMonths($plan->term_months)->toDateString(),
            ]);

            return response()->json([
                'message' => 'Free plan activated',
                'subscription_id' => $subscriptionId,
                'requires_payment' => false,
            ])->header('Access-Control-Allow-Origin', '*');
        }

        // Paid plan - create PayMongo checkout session
        try {
            // Cancel any existing active subscriptions
            DB::table('user_subscriptions')
                ->where('user_id', $userId)
                ->where('status', 'active')
                ->update(['status' => 'cancelled']);

            // Create pending subscription first
            $subscriptionId = DB::table('user_subscriptions')->insertGetId([
                'user_id' => $userId,
                'subscription_id' => $plan->subscription_id,
                'status' => 'pending',
                'start_date' => Carbon::now()->toDateString(),
                'end_date' => Carbon::now()->addMonths($plan->term_months)->toDateString(),
            ]);

            // Create checkout session
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
            $checkoutData = [
                'cancel_url' => $frontendUrl . '/app/settings/subscription?payment=cancelled',
                'success_url' => $frontendUrl . '/app/settings/subscription?payment=success&subscription_id=' . $subscriptionId,
                'line_items' => [[
                    'currency' => 'PHP',
                    'amount' => (int)($plan->price * 100), // Convert to centavos
                    'name' => "LogiSync {$plan->plan_name} Plan",
                    'quantity' => 1,
                    'description' => "{$plan->term_months} month(s) subscription"
                ]],
                'payment_method_types' => ['card', 'gcash', 'paymaya'],
                'description' => "LogiSync {$plan->plan_name} Subscription",
                'reference_number' => 'SUB-' . $subscriptionId . '-' . time(),
            ];

            $checkoutResponse = $this->callPaymongoAPI('POST', '/checkout_sessions', $checkoutData);
            $checkoutSession = $checkoutResponse->data;

            return response()->json([
                'message' => 'Checkout session created',
                'subscription_id' => $subscriptionId,
                'requires_payment' => true,
                'checkout_url' => $checkoutSession->attributes->checkout_url,
                'session_id' => $checkoutSession->id,
            ])->header('Access-Control-Allow-Origin', '*');

        } catch (\Exception $e) {
            \Log::error('PayMongo Checkout Error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to create checkout session',
                'error' => $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*');
        }
    }

    // Handle successful payment callback
    public function handleSuccess(Request $request)
    {
        $subscriptionId = $request->input('subscription_id');

        if (!$subscriptionId) {
            return response()->json(['message' => 'Subscription ID required'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Activate the subscription
        DB::table('user_subscriptions')
            ->where('user_subscription_id', $subscriptionId)
            ->update(['status' => 'active']);

        return response()->json([
            'message' => 'Subscription activated successfully',
            'subscription_id' => $subscriptionId
        ])->header('Access-Control-Allow-Origin', '*');
    }
}
