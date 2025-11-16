<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
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
            ->join('subscriptions as s', 'us.subscription_id', '=', 's.subscription_id')
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
                'id' => $subscription->user_subscription_id,
                'plan_name' => $subscription->plan_name,
                'slug' => $subscription->slug,
                'status' => $subscription->status,
                'started_at' => $subscription->start_date,
                'expires_at' => $subscription->end_date,
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
                'subscription_id' => $plan->subscription_id,
                'status' => 'pending',
                'start_date' => Carbon::now()->toDateString(),
                'end_date' => Carbon::now()->addMonths($plan->term_months)->toDateString(),
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
            ->where('user_subscription_id', $subscriptionId)
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
                $plan = DB::table('subscriptions')->where('subscription_id', $subscription->subscription_id)->first();

                DB::table('user_subscriptions')->where('user_subscription_id', $subscriptionId)->update([
                    'status' => 'active',
                    'start_date' => Carbon::now()->toDateString(),
                    'end_date' => Carbon::now()->addMonths($plan->term_months)->toDateString(),
                ]);

                // Get user details
                $user = DB::table('users')->where('user_id', $userId)->first();

                // Send receipt email to admin
                $this->sendReceiptEmail($user, $plan, $plan->price, $paymentIntent);

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
            ->where('user_subscription_id', $subscriptionId)
            ->where('user_id', $userId)
            ->first();

        if (!$subscription) {
            return response()->json(['message' => 'Subscription not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        DB::table('user_subscriptions')->where('user_subscription_id', $subscriptionId)->update([
            'status' => 'cancelled',
        ]);

        return response()->json([
            'message' => 'Subscription cancelled successfully',
        ])->header('Access-Control-Allow-Origin', '*');
    }

    // Admin: Get all user subscriptions
    public function getAllSubscriptions(Request $request)
    {
        $userId = $request->header('X-User-Id');

        if (!$userId) {
            return response()->json(['message' => 'User not authenticated'], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Check if user is admin
        $user = DB::table('users')->where('user_id', $userId)->first();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $subscriptions = DB::table('user_subscriptions as us')
            ->join('subscriptions as s', 'us.subscription_id', '=', 's.subscription_id')
            ->join('users as u', 'us.user_id', '=', 'u.user_id')
            ->select(
                'us.user_subscription_id',
                'us.user_id',
                'u.username',
                'u.email',
                's.plan_name',
                's.slug',
                's.price',
                'us.status',
                'us.start_date',
                'us.end_date'
            )
            ->orderBy('us.start_date', 'desc')
            ->get();

        return response()->json(['data' => $subscriptions])
            ->header('Access-Control-Allow-Origin', '*');
    }

    // Admin: Update subscription status
    public function updateSubscriptionStatus(Request $request, $subscriptionId)
    {
        $userId = $request->header('X-User-Id');

        if (!$userId) {
            return response()->json(['message' => 'User not authenticated'], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Check if user is admin
        $user = DB::table('users')->where('user_id', $userId)->first();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $data = $request->all();
        $validator = Validator::make($data, [
            'status' => 'required|in:active,cancelled,expired,pending',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $subscription = DB::table('user_subscriptions')->where('user_subscription_id', $subscriptionId)->first();

        if (!$subscription) {
            return response()->json(['message' => 'Subscription not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        DB::table('user_subscriptions')->where('user_subscription_id', $subscriptionId)->update([
            'status' => $data['status'],
        ]);

        return response()->json([
            'message' => 'Subscription status updated successfully',
        ])->header('Access-Control-Allow-Origin', '*');
    }

    // Admin: Extend subscription
    public function extendSubscription(Request $request, $subscriptionId)
    {
        $userId = $request->header('X-User-Id');

        if (!$userId) {
            return response()->json(['message' => 'User not authenticated'], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Check if user is admin
        $user = DB::table('users')->where('user_id', $userId)->first();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $data = $request->all();
        $validator = Validator::make($data, [
            'months' => 'required|integer|min:1|max:24',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $subscription = DB::table('user_subscriptions')->where('user_subscription_id', $subscriptionId)->first();

        if (!$subscription) {
            return response()->json(['message' => 'Subscription not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $newEndDate = Carbon::parse($subscription->end_date)->addMonths($data['months'])->toDateString();

        DB::table('user_subscriptions')->where('user_subscription_id', $subscriptionId)->update([
            'end_date' => $newEndDate,
        ]);

        return response()->json([
            'message' => 'Subscription extended successfully',
            'new_end_date' => $newEndDate,
        ])->header('Access-Control-Allow-Origin', '*');
    }

    // Check and update expired subscriptions
    public function checkExpiredSubscriptions()
    {
        $now = Carbon::now()->toDateString();

        // Mark expired subscriptions
        DB::table('user_subscriptions')
            ->where('status', 'active')
            ->where('end_date', '<', $now)
            ->update(['status' => 'expired']);

        return response()->json([
            'message' => 'Expired subscriptions updated',
        ])->header('Access-Control-Allow-Origin', '*');
    }

    // Send renewal reminders for expiring subscriptions
    public function sendRenewalReminders()
    {
        // Get subscriptions expiring in the next 7 days
        $sevenDaysFromNow = Carbon::now()->addDays(7)->toDateString();
        $now = Carbon::now()->toDateString();

        $expiringSubscriptions = DB::table('user_subscriptions as us')
            ->join('subscriptions as s', 'us.subscription_id', '=', 's.subscription_id')
            ->join('users as u', 'us.user_id', '=', 'u.user_id')
            ->where('us.status', 'active')
            ->whereBetween('us.end_date', [$now, $sevenDaysFromNow])
            ->select('us.*', 's.plan_name', 's.price', 'u.username', 'u.email')
            ->get();

        $remindersSent = 0;

        foreach ($expiringSubscriptions as $subscription) {
            try {
                $this->sendRenewalReminderEmail($subscription);
                $remindersSent++;
            } catch (\Exception $e) {
                \Log::error("Failed to send renewal reminder for subscription {$subscription->user_subscription_id}: " . $e->getMessage());
            }
        }

        return response()->json([
            'message' => "Renewal reminders sent: {$remindersSent}",
            'count' => $remindersSent,
        ])->header('Access-Control-Allow-Origin', '*');
    }

    private function sendRenewalReminderEmail($subscription)
    {
        $daysLeft = Carbon::parse($subscription->end_date)->diffInDays(Carbon::now());

        $emailBody = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .details-box { background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .row:last-child { border-bottom: none; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1 style='margin: 0; font-size: 28px;'>⏰ Subscription Renewal Reminder</h1>
            <p style='margin: 10px 0 0 0; opacity: 0.9;'>LogiSync</p>
        </div>

        <div class='content'>
            <p>Dear {$subscription->username},</p>

            <div class='alert-box'>
                <h3 style='margin: 0 0 10px 0; color: #92400e;'>⚠️ Your subscription is expiring soon!</h3>
                <p style='margin: 0; color: #92400e; font-size: 16px;'>
                    Your <strong>{$subscription->plan_name}</strong> plan will expire in <strong>{$daysLeft} day(s)</strong> on <strong>" . Carbon::parse($subscription->end_date)->format('F d, Y') . "</strong>.
                </p>
            </div>

            <p style='font-size: 15px;'>
                To ensure uninterrupted access to all LogiSync features, please renew your subscription before it expires.
            </p>

            <div class='details-box'>
                <h4 style='margin: 0 0 15px 0; color: #111827;'>Current Subscription Details</h4>
                <div class='row'>
                    <span style='color: #6b7280;'>Plan</span>
                    <span style='font-weight: 600; color: #111827;'>{$subscription->plan_name}</span>
                </div>
                <div class='row'>
                    <span style='color: #6b7280;'>Monthly Price</span>
                    <span style='font-weight: 600; color: #111827;'>₱" . number_format($subscription->price, 2) . "</span>
                </div>
                <div class='row'>
                    <span style='color: #6b7280;'>Expiration Date</span>
                    <span style='font-weight: 600; color: #ef4444;'>" . Carbon::parse($subscription->end_date)->format('F d, Y') . "</span>
                </div>
            </div>

            <div style='text-align: center;'>
                <a href='" . config('app.url') . "/app/settings/subscription' class='button'>
                    Renew Subscription Now
                </a>
            </div>

            <p style='color: #6b7280; font-size: 14px; margin-top: 30px;'>
                If you have any questions about your subscription or need assistance, please contact our support team.
            </p>
        </div>

        <div class='footer'>
            <p>This is an automated reminder from LogiSync</p>
            <p>Davao City, Philippines</p>
        </div>
    </div>
</body>
</html>
";

        Mail::send([], [], function ($message) use ($subscription, $emailBody) {
            $message->to($subscription->email)
                ->subject('⏰ Your LogiSync Subscription Expires Soon')
                ->html($emailBody);
        });

        \Log::info("Renewal reminder sent to: {$subscription->email} (Subscription ID: {$subscription->user_subscription_id})");
    }

    private function sendReceiptEmail($user, $plan, $amount, $paymentIntent)
    {
        try {
            $receiptNumber = 'LGSYNC-' . strtoupper(substr(md5($paymentIntent->id), 0, 8));
            $paymentDate = Carbon::now()->format('F d, Y h:i A');

            $emailBody = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .receipt-box { background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .row:last-child { border-bottom: none; }
        .label { color: #6b7280; font-size: 14px; }
        .value { font-weight: 600; color: #111827; }
        .total-row { background: #f3f4f6; padding: 15px; border-radius: 6px; margin-top: 10px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        .badge { background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1 style='margin: 0; font-size: 28px;'>🧾 Payment Receipt</h1>
            <p style='margin: 10px 0 0 0; opacity: 0.9;'>LogiSync Subscription</p>
        </div>

        <div class='content'>
            <p>Dear Admin,</p>
            <p>A new subscription payment has been successfully processed.</p>

            <div class='receipt-box'>
                <div style='text-align: center; margin-bottom: 20px;'>
                    <span class='badge'>✓ PAID</span>
                    <h3 style='margin: 10px 0; color: #111827;'>Receipt #{$receiptNumber}</h3>
                    <p style='color: #6b7280; margin: 5px 0; font-size: 14px;'>{$paymentDate}</p>
                </div>

                <div style='border-top: 2px solid #e5e7eb; padding-top: 20px;'>
                    <div class='row'>
                        <span class='label'>Customer</span>
                        <span class='value'>{$user->username}</span>
                    </div>
                    <div class='row'>
                        <span class='label'>Email</span>
                        <span class='value'>{$user->email}</span>
                    </div>
                    <div class='row'>
                        <span class='label'>Subscription Plan</span>
                        <span class='value'>{$plan->plan_name}</span>
                    </div>
                    <div class='row'>
                        <span class='label'>Billing Period</span>
                        <span class='value'>{$plan->term_months} month(s)</span>
                    </div>
                    <div class='row'>
                        <span class='label'>Payment Method</span>
                        <span class='value'>PayMongo</span>
                    </div>
                    <div class='row'>
                        <span class='label'>Transaction ID</span>
                        <span class='value' style='font-family: monospace; font-size: 12px;'>{$paymentIntent->id}</span>
                    </div>
                </div>

                <div class='total-row'>
                    <div style='display: flex; justify-content: space-between; align-items: center;'>
                        <span style='font-size: 18px; font-weight: 600; color: #111827;'>Total Amount Paid</span>
                        <span style='font-size: 24px; font-weight: 700; color: #3b82f6;'>₱" . number_format($amount, 2) . "</span>
                    </div>
                </div>
            </div>

            <div style='background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0;'>
                <p style='margin: 0; color: #92400e; font-size: 14px;'>
                    <strong>📌 Important:</strong> This is an automated notification. The subscription has been automatically activated for the customer.
                </p>
            </div>

            <p style='color: #6b7280; font-size: 14px;'>
                The customer can now access all features included in the {$plan->plan_name} plan.
                The subscription will automatically renew on <strong>" . Carbon::now()->addMonths($plan->term_months)->format('F d, Y') . "</strong>.
            </p>
        </div>

        <div class='footer'>
            <p>This receipt was automatically generated by LogiSync</p>
            <p>Davao City, Philippines</p>
            <p style='margin-top: 10px;'>
                <a href='" . config('app.url') . "' style='color: #3b82f6; text-decoration: none;'>Visit LogiSync Dashboard</a>
            </p>
        </div>
    </div>
</body>
</html>
";

            Mail::send([], [], function ($message) use ($user, $emailBody) {
                $message->to($user->email)
                    ->subject('💰 New Subscription Payment Received - LogiSync')
                    ->html($emailBody);
            });

            \Log::info("Receipt email sent to admin: {$user->email}");
        } catch (\Exception $e) {
            \Log::error("Failed to send receipt email: " . $e->getMessage());
        }
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
