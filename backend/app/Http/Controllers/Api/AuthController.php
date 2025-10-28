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
            $emailBody = "Hello " . ($data['name'] ?? 'there') . ",\n\n";
            $emailBody .= "Welcome to LogiSync! To complete your registration, please verify your email address.\n\n";
            $emailBody .= "Your verification code is: {$verificationCode}\n\n";
            $emailBody .= "This code will expire in 15 minutes.\n\n";
            $emailBody .= "If you didn't create a LogiSync account, please ignore this email.\n\n";
            $emailBody .= "Best regards,\nThe LogiSync Team\nDavao City, Philippines";

            Mail::raw($emailBody, function ($message) use ($data) {
                $message->to($data['email'])
                    ->subject('Verify your LogiSync account');
            });
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
            $emailBody = "Hello,\n\n";
            $emailBody .= "We received a request to resend your verification code.\n\n";
            $emailBody .= "Your new verification code is: {$verificationCode}\n\n";
            $emailBody .= "This code will expire in 15 minutes.\n\n";
            $emailBody .= "If you didn't request this, please ignore this email.\n\n";
            $emailBody .= "Best regards,\nThe LogiSync Team\nDavao City, Philippines";

            Mail::raw($emailBody, function ($message) use ($data) {
                $message->to($data['email'])
                    ->subject('LogiSync - New Verification Code');
            });
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
            'email' => 'required|email',
            'password' => 'required',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $user = DB::table('users')->where('email', $data['email'])->first();
        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Check if email is verified
        if (!$user->email_verified) {
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
}