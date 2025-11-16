<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
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
                'payment_email' => null,
                'checkout_session_id' => null,
            ]);

            // Create checkout session
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
            $checkoutData = [
                'cancel_url' => $frontendUrl . '/payment/success?payment=cancelled',
                'success_url' => $frontendUrl . '/payment/success?subscription_id=' . $subscriptionId,
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

            // Store checkout session ID
            DB::table('user_subscriptions')
                ->where('user_subscription_id', $subscriptionId)
                ->update(['checkout_session_id' => $checkoutSession->id]);

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
        \Log::info('=== Payment Success Handler Called ===');
        \Log::info('Subscription ID: ' . $subscriptionId);

        if (!$subscriptionId) {
            return response()->json(['message' => 'Subscription ID required'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        try {
            // Get subscription
            $subscription = DB::table('user_subscriptions')
                ->where('user_subscription_id', $subscriptionId)
                ->first();

            if (!$subscription) {
                \Log::error('Subscription not found: ' . $subscriptionId);
                return response()->json(['message' => 'Subscription not found'], 404)
                    ->header('Access-Control-Allow-Origin', '*');
            }

            \Log::info('Found subscription. Checkout session ID: ' . $subscription->checkout_session_id);

            // Retrieve checkout session from PayMongo
            $checkoutSession = $this->callPaymongoAPI('GET', '/checkout_sessions/' . $subscription->checkout_session_id);
            \Log::info('PayMongo checkout session retrieved');
            \Log::info('Checkout session data: ' . json_encode($checkoutSession));

            // Try to get email from billing first, then from payments array
            $customerEmail = $checkoutSession->data->attributes->billing->email ?? null;

            // If not in billing, check the payments array
            if (!$customerEmail && !empty($checkoutSession->data->attributes->payments)) {
                $customerEmail = $checkoutSession->data->attributes->payments[0]->attributes->billing->email ?? null;
            }

            \Log::info('Customer email from PayMongo: ' . ($customerEmail ?? 'NULL'));

            // Activate the subscription and store payment email
            DB::table('user_subscriptions')
                ->where('user_subscription_id', $subscriptionId)
                ->update([
                    'status' => 'active',
                    'payment_email' => $customerEmail
                ]);

            \Log::info('Subscription updated to active. Payment email: ' . ($customerEmail ?? 'NULL'));

            // Send receipt email to the payment email
            if ($customerEmail) {
                \Log::info('Preparing to send receipt email to: ' . $customerEmail);

                $plan = DB::table('subscriptions')
                    ->where('subscription_id', $subscription->subscription_id)
                    ->first();

                $user = DB::table('users')
                    ->where('user_id', $subscription->user_id)
                    ->first();

                \Log::info('Plan: ' . $plan->plan_name . ', User: ' . $user->username);

                // Create a mock payment intent object for the email template
                $paymentIntent = (object)[
                    'id' => $subscription->checkout_session_id,
                    'attributes' => (object)[
                        'status' => 'succeeded'
                    ]
                ];

                $this->sendReceiptEmail($customerEmail, $user->username, $plan, $plan->price, $paymentIntent);
                \Log::info('sendReceiptEmail() called successfully');
            } else {
                \Log::warning('No customer email found from PayMongo checkout session');
            }

            return response()->json([
                'message' => 'Subscription activated successfully',
                'subscription_id' => $subscriptionId
            ])->header('Access-Control-Allow-Origin', '*');

        } catch (\Exception $e) {
            \Log::error('Payment success handler error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Error processing payment',
                'error' => $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*');
        }
    }

    private function sendReceiptEmail($email, $username, $plan, $amount, $paymentIntent)
    {
        try {
            \Log::info('=== sendReceiptEmail() Started ===');
            \Log::info('Email: ' . $email);
            \Log::info('Username: ' . $username);
            \Log::info('Plan: ' . $plan->plan_name);
            \Log::info('Amount: ' . $amount);

            $receiptNumber = 'LGSYNC-' . strtoupper(substr(md5($paymentIntent->id), 0, 8));
            $paymentDate = Carbon::now()->format('F d, Y h:i A');

            \Log::info('Receipt number: ' . $receiptNumber);
            \Log::info('Payment date: ' . $paymentDate);

            $emailBody = "
<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            line-height: 1.6;
        }
        .email-container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
        }
        .header {
            background: #5469d4;
            padding: 40px 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            color: white;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 40px;
        }
        .receipt-title {
            text-align: center;
            margin-bottom: 30px;
        }
        .receipt-title h2 {
            margin: 0 0 8px;
            font-size: 20px;
            color: #1a1a1a;
            font-weight: 600;
        }
        .receipt-title p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
        }
        .status-badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
            margin-bottom: 16px;
        }
        .divider {
            border: 0;
            border-top: 1px solid #e5e7eb;
            margin: 24px 0;
        }
        .info-row {
            display: table;
            width: 100%;
            margin-bottom: 12px;
        }
        .info-label {
            display: table-cell;
            color: #6b7280;
            font-size: 14px;
            padding: 8px 0;
        }
        .info-value {
            display: table-cell;
            color: #1a1a1a;
            font-size: 14px;
            font-weight: 500;
            text-align: right;
            padding: 8px 0;
        }
        .total-section {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 24px 0;
        }
        .total-row {
            display: table;
            width: 100%;
        }
        .total-label {
            display: table-cell;
            font-size: 16px;
            font-weight: 600;
            color: #1a1a1a;
        }
        .total-amount {
            display: table-cell;
            font-size: 24px;
            font-weight: 700;
            color: #5469d4;
            text-align: right;
        }
        .footer {
            text-align: center;
            padding: 30px 40px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 4px 0;
            color: #6b7280;
            font-size: 13px;
        }
        .footer a {
            color: #5469d4;
            text-decoration: none;
        }
        .merchant-name {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin-top: 8px;
        }
    </style>
</head>
<body>
    <div class='email-container'>
        <div class='header'>
            <h1>Payment Receipt</h1>
            <p class='merchant-name'>LogiSync</p>
        </div>

        <div class='content'>
            <div class='receipt-title'>
                <span class='status-badge'>PAID</span>
                <h2>Receipt #{$receiptNumber}</h2>
                <p>{$paymentDate}</p>
            </div>

            <hr class='divider'>

            <div class='info-row'>
                <span class='info-label'>Billed to</span>
                <span class='info-value'>{$username}</span>
            </div>
            <div class='info-row'>
                <span class='info-label'>Email</span>
                <span class='info-value'>{$email}</span>
            </div>

            <hr class='divider'>

            <div class='info-row'>
                <span class='info-label'>Description</span>
                <span class='info-value'>LogiSync {$plan->plan_name} Plan</span>
            </div>
            <div class='info-row'>
                <span class='info-label'>Billing Period</span>
                <span class='info-value'>{$plan->term_months} month(s)</span>
            </div>
            <div class='info-row'>
                <span class='info-label'>Payment Method</span>
                <span class='info-value'>Card</span>
            </div>
            <div class='info-row'>
                <span class='info-label'>Transaction ID</span>
                <span class='info-value' style='font-family: monospace; font-size: 12px;'>{$paymentIntent->id}</span>
            </div>

            <div class='total-section'>
                <div class='total-row'>
                    <span class='total-label'>Total Amount Paid</span>
                    <span class='total-amount'>₱" . number_format($amount, 2) . "</span>
                </div>
            </div>

            <p style='color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 24px;'>
                Your subscription is now active and will automatically renew on <strong>" . Carbon::now()->addMonths($plan->term_months)->format('F d, Y') . "</strong>.
            </p>
        </div>

        <div class='footer'>
            <p>Powered by <a href='https://paymongo.com'>PayMongo</a></p>
            <p>LogiSync - Philippines</p>
            <p style='margin-top: 12px;'>
                <a href='" . config('app.url') . "'>Visit Dashboard</a>
            </p>
        </div>
    </div>
</body>
</html>
";

            \Log::info('Attempting to send email via Mail::send()');

            Mail::send([], [], function ($message) use ($email, $emailBody) {
                $message->to($email)
                    ->subject('💰 Payment Receipt - LogiSync Subscription')
                    ->html($emailBody);
            });

            \Log::info("✅ Receipt email sent successfully to: {$email}");
        } catch (\Exception $e) {
            \Log::error("❌ Failed to send receipt email: " . $e->getMessage());
            \Log::error("Stack trace: " . $e->getTraceAsString());
        }
    }
}
