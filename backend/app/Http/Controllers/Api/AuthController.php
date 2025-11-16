<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'name' => 'nullable|string|max:255',
            'company' => 'nullable|string|max:255',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Generate 6-digit verification code
        $verificationCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = Carbon::now()->addMinutes(15);

        // Create organization for the new admin user
        $organizationId = DB::table('organizations')->insertGetId([
            'name' => $data['company'] ?? ($data['name'] ?? $data['email']) . "'s Organization",
            'email' => $data['email'],
            'phone' => null,
            'address' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $id = DB::table('users')->insertGetId([
            'username' => $data['name'] ?? ($data['email'] ?? ''),
            'password' => Hash::make($data['password']),
            'role' => 'admin',
            'email' => $data['email'],
            'organization_id' => $organizationId,
            'email_verification_code' => $verificationCode,
            'email_verification_code_expires_at' => $expiresAt,
            'email_verified' => false,
        ], 'user_id');

        // Send verification email
        try {
            $this->sendVerificationEmail($data['email'], $data['name'] ?? 'there', $verificationCode);
        } catch (\Exception $e) {
            // Log error but don't fail registration
            \Log::error('Failed to send verification email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Account created. Please check your email for verification code.',
            'user_id' => $id,
            'email' => $data['email'],
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }

    public function verifyEmail(Request $request)
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'email' => 'required|email',
            'code' => 'required|string|size:6',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $user = DB::table('users')->where('email', $data['email'])->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        if ($user->email_verified) {
            return response()->json(['message' => 'Email already verified'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        if ($user->email_verification_code !== $data['code']) {
            return response()->json(['message' => 'Invalid verification code'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $expiresAt = Carbon::parse($user->email_verification_code_expires_at);
        if (Carbon::now()->greaterThan($expiresAt)) {
            return response()->json(['message' => 'Verification code has expired'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Mark as verified
        DB::table('users')->where('email', $data['email'])->update([
            'email_verified' => true,
            'email_verification_code' => null,
            'email_verification_code_expires_at' => null,
        ]);

        return response()->json([
            'message' => 'Email verified successfully',
            'user' => [
                'user_id' => $user->user_id ?? null,
                'email' => $user->email,
                'username' => $user->username ?? null,
                'role' => $user->role ?? 'admin',
                'organization_id' => $user->organization_id ?? null,
            ],
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function resendVerification(Request $request)
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'email' => 'required|email',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $user = DB::table('users')->where('email', $data['email'])->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        if ($user->email_verified) {
            return response()->json(['message' => 'Email already verified'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Generate new code
        $verificationCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = Carbon::now()->addMinutes(15);

        DB::table('users')->where('email', $data['email'])->update([
            'email_verification_code' => $verificationCode,
            'email_verification_code_expires_at' => $expiresAt,
        ]);

        // Send verification email
        try {
            $userName = $user->username ?? 'there';
            $this->sendVerificationEmail($data['email'], $userName, $verificationCode);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to send email'], 500)
                ->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json([
            'message' => 'Verification code resent successfully',
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function login(Request $request)
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'email' => 'required|string', // Accept username or email
            'password' => 'required',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Check if input is email or username
        $loginField = filter_var($data['email'], FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        $user = DB::table('users')->where($loginField, $data['email'])->first();
        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Check if email is verified (only for admin accounts)
        if ($user->role === 'admin' && !$user->email_verified) {
            return response()->json([
                'message' => 'Email not verified. Please verify your email first.',
                'email_verified' => false,
            ], 403)->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json([
            'message' => 'OK',
            'user' => [
                'user_id' => $user->user_id ?? null,
                'email' => $user->email,
                'username' => $user->username ?? null,
                'role' => $user->role ?? 'admin',
                'organization_id' => $user->organization_id ?? null,
            ],
            'token' => 'demo',
        ])->header('Access-Control-Allow-Origin', '*');
    }

    private function sendVerificationEmail($email, $userName, $verificationCode)
    {
        $createdDate = Carbon::now()->format('F d, Y h:i A');
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');

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
        .status-section {
            text-align: center;
            margin-bottom: 30px;
        }
        .status-section h2 {
            margin: 0 0 8px;
            font-size: 20px;
            color: #1a1a1a;
            font-weight: 600;
        }
        .status-section p {
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
        .code-box {
            background: #f9fafb;
            border: 2px solid #5469d4;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
        }
        .verification-code {
            font-size: 42px;
            font-weight: 700;
            color: #5469d4;
            font-family: monospace;
            letter-spacing: 8px;
            margin: 8px 0;
        }
        .code-label {
            margin: 0 0 8px 0;
            color: #6b7280;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .divider {
            border: 0;
            border-top: 1px solid #e5e7eb;
            margin: 24px 0;
        }
        .info-box {
            background: #dbeafe;
            border-left: 4px solid #3b82f6;
            padding: 16px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .info-box p {
            margin: 0;
            color: #1e40af;
            font-size: 14px;
        }
        .warning-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .warning-box p {
            margin: 0;
            color: #92400e;
            font-size: 14px;
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
            <h1>🔐 Email Verification</h1>
            <p class='merchant-name'>LogiSync Logistics</p>
        </div>

        <div class='content'>
            <div class='status-section'>
                <span class='status-badge'>VERIFY EMAIL</span>
                <h2>Welcome to LogiSync!</h2>
                <p>{$createdDate}</p>
            </div>

            <p style='color: #6b7280; font-size: 15px; line-height: 1.6;'>
                Hello <strong>{$userName}</strong>,
            </p>

            <p style='color: #6b7280; font-size: 15px; line-height: 1.6; margin-top: 16px;'>
                Thank you for creating a LogiSync account! To complete your registration and start managing your logistics operations, please verify your email address using the code below.
            </p>

            <div class='code-box'>
                <p class='code-label'>Your Verification Code</p>
                <div class='verification-code'>{$verificationCode}</div>
            </div>

            <div class='warning-box'>
                <p>
                    <strong>⏱️ This code will expire in 15 minutes.</strong> Please verify your email as soon as possible.
                </p>
            </div>

            <hr class='divider'>

            <div class='info-box'>
                <p>
                    <strong>📧 How to Verify:</strong> Enter this 6-digit code on the verification page to activate your account and access the full features of LogiSync.
                </p>
            </div>

            <hr class='divider'>

            <p style='color: #6b7280; font-size: 14px; line-height: 1.6;'>
                If you didn't create a LogiSync account, you can safely ignore this email. Your information is secure with us.
            </p>

            <p style='color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 16px;'>
                Need help? Feel free to reach out to our support team.
            </p>
        </div>

        <div class='footer'>
            <p>LogiSync - Davao City, Philippines</p>
        </div>
    </div>
</body>
</html>
";

        Mail::send([], [], function ($message) use ($email, $verificationCode, $emailBody) {
            $message->to($email)
                ->subject("🔐 Verify Your LogiSync Account - Code: {$verificationCode}")
                ->html($emailBody);
        });

        \Log::info("Verification email sent to: {$email}");
    }
}