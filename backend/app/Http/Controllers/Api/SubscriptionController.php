<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class SubscriptionController extends Controller
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

    // Get all available subscription plans
    public function index()
    {
        $plans = DB::table('subscriptions')
            ->where('active', true)
            ->orderBy('price')
            ->get()
            ->map(function ($plan) {
                return [
                    'id' => $plan->subscription_id,
                    'name' => $plan->plan_name,
                    'slug' => $plan->slug,
                    'description' => $plan->description,
                    'price' => (int) $plan->price,
                    'term_months' => (int) $plan->term_months,
                    'features' => $this->getPlanFeatures($plan->slug),
                ];
            });

        return response()->json(['data' => $plans])
            ->header('Access-Control-Allow-Origin', '*');
    }

    // Get user's current subscription
    public function getCurrentSubscription(Request $request)
    {
        $userId = $request->header('X-User-Id');

        if (!$userId) {
            return response()->json(['message' => 'User not authenticated'], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $subscription = DB::table('user_subscriptions as us')
            ->join('subscriptions as s', 'us.plan_id', '=', 's.subscription_id')
            ->where('us.user_id', $userId)
            ->where('us.status', 'active')
            ->select('us.*', 's.plan_name', 's.slug', 's.price')
            ->first();

        if (!$subscription) {
            return response()->json([
                'data' => null,
                'message' => 'No active subscription'
            ])->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json([
            'data' => [
                'id' => $subscription->id,
                'plan_name' => $subscription->plan_name,
                'slug' => $subscription->slug,
                'status' => $subscription->status,
                'started_at' => $subscription->started_at,
                'expires_at' => $subscription->expires_at,
                'amount_paid' => (int) $subscription->amount_paid_cents,
            ]
        ])->header('Access-Control-Allow-Origin', '*');
    }

    // Create a payment intent for a subscription
    public function createPaymentIntent(Request $request)
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
            $subscriptionId = DB::table('user_subscriptions')->insertGetId([
                'user_id' => $userId,
                'plan_id' => $plan->subscription_id,
                'status' => 'active',
                'amount_paid_cents' => 0,
                'started_at' => Carbon::now(),
                'expires_at' => Carbon::now()->addMonths($plan->term_months),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);

            return response()->json([
                'message' => 'Free plan activated',
                'subscription_id' => $subscriptionId,
                'requires_payment' => false,
            ])->header('Access-Control-Allow-Origin', '*');
        }

        // Paid plan - create PayMongo payment intent
        try {
            $paymentIntentResponse = $this->callPaymongoAPI('POST', '/payment_intents', [
                'amount' => $plan->price * 100, // Convert to centavos
                'currency' => 'PHP',
                'description' => "LogiSync {$plan->plan_name} Plan - {$plan->term_months} month(s)",
                'statement_descriptor' => 'LogiSync Subscription',
                'payment_method_allowed' => ['card', 'gcash', 'paymaya'],
            ]);

            $paymentIntent = $paymentIntentResponse->data;

            // Create pending subscription
            $subscriptionId = DB::table('user_subscriptions')->insertGetId([
                'user_id' => $userId,
                'plan_id' => $plan->subscription_id,
                'status' => 'pending',
                'paymongo_payment_intent_id' => $paymentIntent->id,
                'amount_paid_cents' => $plan->price * 100,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);

            return response()->json([
                'message' => 'Payment intent created',
                'subscription_id' => $subscriptionId,
                'requires_payment' => true,
                'payment_intent' => [
                    'id' => $paymentIntent->id,
                    'client_key' => $paymentIntent->attributes->client_key,
                    'status' => $paymentIntent->attributes->status,
                ],
            ])->header('Access-Control-Allow-Origin', '*');

        } catch (\Exception $e) {
            \Log::error('PayMongo Error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to create payment',
                'error' => $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*');
        }
    }

    // Attach payment method and confirm payment
    public function confirmPayment(Request $request, $subscriptionId)
    {
        $userId = $request->header('X-User-Id');

        if (!$userId) {
            return response()->json(['message' => 'User not authenticated'], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $subscription = DB::table('user_subscriptions')
            ->where('id', $subscriptionId)
            ->where('user_id', $userId)
            ->first();

        if (!$subscription) {
            return response()->json(['message' => 'Subscription not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        if ($subscription->status !== 'pending') {
            return response()->json(['message' => 'Subscription already processed'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $data = $request->all();
        $validator = Validator::make($data, [
            'payment_method_id' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        try {
            // Attach payment method to intent
            $paymentIntentResponse = $this->callPaymongoAPI(
                'POST',
                "/payment_intents/{$subscription->paymongo_payment_intent_id}/attach",
                ['payment_method' => $data['payment_method_id']]
            );

            $paymentIntent = $paymentIntentResponse->data;

            // Check payment status
            if ($paymentIntent->attributes->status === 'succeeded') {
                $plan = DB::table('subscriptions')->where('subscription_id', $subscription->plan_id)->first();

                DB::table('user_subscriptions')->where('id', $subscriptionId)->update([
                    'status' => 'active',
                    'paymongo_payment_method_id' => $data['payment_method_id'],
                    'started_at' => Carbon::now(),
                    'expires_at' => Carbon::now()->addMonths($plan->term_months),
                    'updated_at' => Carbon::now(),
                ]);

                return response()->json([
                    'message' => 'Payment successful! Subscription activated.',
                    'status' => 'active',
                ])->header('Access-Control-Allow-Origin', '*');
            }

            return response()->json([
                'message' => 'Payment processing',
                'status' => $paymentIntent->attributes->status,
            ])->header('Access-Control-Allow-Origin', '*');

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Payment failed',
                'error' => $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*');
        }
    }

    // Cancel subscription
    public function cancel(Request $request, $subscriptionId)
    {
        $userId = $request->header('X-User-Id');

        if (!$userId) {
            return response()->json(['message' => 'User not authenticated'], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $subscription = DB::table('user_subscriptions')
            ->where('id', $subscriptionId)
            ->where('user_id', $userId)
            ->first();

        if (!$subscription) {
            return response()->json(['message' => 'Subscription not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        DB::table('user_subscriptions')->where('id', $subscriptionId)->update([
            'status' => 'cancelled',
            'cancelled_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        return response()->json([
            'message' => 'Subscription cancelled successfully',
        ])->header('Access-Control-Allow-Origin', '*');
    }

    private function getPlanFeatures($slug)
    {
        $features = [
            'free' => [
                'Up to 10 shipments per month',
                'Basic tracking',
                '1 user account',
                'Email support',
            ],
            'pro' => [
                'Up to 100 shipments per month',
                'Real-time GPS tracking',
                'Up to 5 user accounts',
                'Priority email support',
                'Advanced analytics',
                'Invoice generation',
            ],
            'enterprise' => [
                'Unlimited shipments',
                'Real-time GPS tracking',
                'Unlimited user accounts',
                '24/7 priority support',
                'Advanced analytics & reports',
                'Invoice generation',
                'Custom integrations',
                'Dedicated account manager',
            ],
        ];

        return $features[$slug] ?? [];
    }
}
