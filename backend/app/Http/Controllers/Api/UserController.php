<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\UserHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        // Get organization ID to show all team members from same organization
        $orgUserId = UserHelper::getOrganizationUserId($userId);

        $role = $request->query('role');
        $search = $request->query('q');

        // Show only team members (exclude self-created account owner)
        // Self-created accounts have created_by = NULL, team members have created_by set
        $query = DB::table('users')
            ->select('user_id', 'username', 'email', 'role', 'organization_id', 'created_by')
            ->where('organization_id', $orgUserId)
            ->whereNotNull('created_by') // Only show admin-created team members
            ->orderBy('user_id', 'desc');

        if ($role && $role !== 'all') {
            $query->where('role', $role);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('username', 'like', "%$search%")
                  ->orWhere('email', 'like', "%$search%");
            });
        }

        $users = $query->get();

        $data = $users->map(function ($user) {
            return [
                'id' => (int) $user->user_id,
                'user_id' => (int) $user->user_id,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'role_label' => $this->getRoleLabel($user->role),
            ];
        });

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function show(int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        // Get organization ID
        $orgUserId = UserHelper::getOrganizationUserId($userId);

        $user = DB::table('users')
            ->select('user_id', 'username', 'email', 'role')
            ->where('user_id', $id)
            ->where('organization_id', $orgUserId)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $data = [
            'id' => (int) $user->user_id,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,
            'role_label' => $this->getRoleLabel($user->role),
        ];

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function store(Request $request)
    {
        $createdBy = request()->header('X-User-Id');
        if (!$createdBy) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        // Get creator's organization
        $creator = DB::table('users')->where('user_id', $createdBy)->first();
        if (!$creator || !$creator->organization_id) {
            return response()->json(['message' => 'Creator organization not found'], 400);
        }

        $data = $request->all();
        $validator = Validator::make($data, [
            'username' => 'required|string|max:255|unique:users,username',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|string|in:admin,booking_manager,warehouse_manager,driver',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $userId = DB::table('users')->insertGetId([
            'username' => $data['username'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'organization_id' => $creator->organization_id, // Inherit organization from creator
            'email_verified' => true, // Admin-created accounts are automatically verified
            'created_by' => $createdBy, // Track who created this team member
        ], 'user_id');

        // Send email with credentials
        try {
            $this->sendCredentialsEmail($data['email'], $data['username'], $data['password'], $data['role']);
        } catch (\Exception $e) {
            // Log error but don't fail user creation
            \Log::error('Failed to send credentials email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'User created successfully. Credentials have been sent to their email.',
            'user_id' => $userId,
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }

    public function update(Request $request, int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        // Get organization ID
        $orgUserId = UserHelper::getOrganizationUserId($userId);

        $user = DB::table('users')
            ->where('user_id', $id)
            ->where('organization_id', $orgUserId)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $data = $request->all();
        $validator = Validator::make($data, [
            'username' => 'sometimes|string|max:255|unique:users,username,' . $id . ',user_id',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $id . ',user_id',
            'role' => 'sometimes|string|in:admin,booking_manager,warehouse_manager,driver',
            'password' => 'sometimes|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $updateData = [];
        $roleChanged = false;
        $usernameChanged = false;
        $passwordChanged = false;
        $oldRole = $user->role;
        $oldUsername = $user->username;
        $newPassword = null;

        if (isset($data['username']) && $data['username'] !== $user->username) {
            $updateData['username'] = $data['username'];
            $usernameChanged = true;
        }
        if (isset($data['email'])) {
            $updateData['email'] = $data['email'];
        }
        if (isset($data['role']) && $data['role'] !== $oldRole) {
            $updateData['role'] = $data['role'];
            $roleChanged = true;
        }
        if (isset($data['password'])) {
            $updateData['password'] = Hash::make($data['password']);
            $newPassword = $data['password']; // Store plain password for email
            $passwordChanged = true;
        }

        if (!empty($updateData)) {
            DB::table('users')->where('user_id', $id)->update($updateData);
        }

        // Send appropriate email notification (only one email for all changes)
        try {
            if ($roleChanged || $usernameChanged || $passwordChanged) {
                // Send one comprehensive email with all changes
                $this->sendAccountUpdateEmail(
                    $user->email,
                    $oldUsername,
                    $updateData['username'] ?? $user->username,
                    $newPassword,
                    $oldRole,
                    $updateData['role'] ?? $user->role,
                    $roleChanged,
                    $usernameChanged,
                    $passwordChanged
                );
            }
        } catch (\Exception $e) {
            \Log::error('Failed to send update notification email: ' . $e->getMessage());
        }

        return response()->json(['message' => 'User updated successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function destroy(int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        // Get organization ID
        $orgUserId = UserHelper::getOrganizationUserId($userId);

        $user = DB::table('users')
            ->where('user_id', $id)
            ->where('organization_id', $orgUserId)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        DB::table('users')
            ->where('user_id', $id)
            ->where('organization_id', $orgUserId)
            ->delete();

        return response()->json(['message' => 'User deleted successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function checkUsername(Request $request)
    {
        $username = $request->query('username');
        $excludeId = $request->query('exclude_id');

        if (!$username) {
            return response()->json(['available' => true])
                ->header('Access-Control-Allow-Origin', '*');
        }

        $query = DB::table('users')->where('username', $username);

        if ($excludeId) {
            $query->where('user_id', '!=', $excludeId);
        }

        $exists = $query->exists();

        return response()->json(['available' => !$exists])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function checkEmail(Request $request)
    {
        $email = $request->query('email');
        $excludeId = $request->query('exclude_id');

        if (!$email) {
            return response()->json(['available' => true])
                ->header('Access-Control-Allow-Origin', '*');
        }

        $query = DB::table('users')->where('email', $email);

        if ($excludeId) {
            $query->where('user_id', '!=', $excludeId);
        }

        $exists = $query->exists();

        return response()->json(['available' => !$exists])
            ->header('Access-Control-Allow-Origin', '*');
    }

    private function getRoleLabel(string $role): string
    {
        $labels = [
            'admin' => 'Admin',
            'booking_manager' => 'Booking Manager',
            'warehouse_manager' => 'Warehouse Manager',
            'driver' => 'Driver',
        ];

        return $labels[$role] ?? ucfirst($role);
    }

    private function sendCredentialsEmail($email, $username, $password, $role)
    {
        $roleName = $this->getRoleLabel($role);
        $createdDate = Carbon::now()->format('F d, Y h:i A');
        $loginUrl = config('app.url');

        // Build credentials rows based on role
        $credentialsRows = '';
        if ($role === 'driver') {
            // Drivers only see username
            $credentialsRows = "
                <div class='credential-row'>
                    <span class='credential-label'>Username</span>
                    <span class='credential-value'>{$username}</span>
                </div>
                <div class='credential-row'>
                    <span class='credential-label'>Password</span>
                    <span class='credential-value'>{$password}</span>
                </div>";
        } else {
            // Admins, booking managers, warehouse managers see both
            $credentialsRows = "
                <div class='credential-row'>
                    <span class='credential-label'>Username</span>
                    <span class='credential-value'>{$username}</span>
                </div>
                <div class='credential-row'>
                    <span class='credential-label'>Email</span>
                    <span class='credential-value'>{$email}</span>
                </div>
                <div class='credential-row'>
                    <span class='credential-label'>Password</span>
                    <span class='credential-value'>{$password}</span>
                </div>";
        }

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
        .welcome-section {
            text-align: center;
            margin-bottom: 30px;
        }
        .welcome-section h2 {
            margin: 0 0 8px;
            font-size: 20px;
            color: #1a1a1a;
            font-weight: 600;
        }
        .welcome-section p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
        }
        .role-badge {
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
        .credentials-box {
            background: #f9fafb;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
        }
        .credential-row {
            display: table;
            width: 100%;
            margin-bottom: 16px;
        }
        .credential-row:last-child {
            margin-bottom: 0;
        }
        .credential-label {
            display: table-cell;
            color: #6b7280;
            font-size: 14px;
            font-weight: 600;
            padding: 8px 0;
            width: 30%;
        }
        .credential-value {
            display: table-cell;
            color: #1a1a1a;
            font-size: 14px;
            font-family: monospace;
            background: white;
            padding: 10px 16px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
        }
        .login-button {
            display: inline-block;
            background: #5469d4;
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
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
            <h1>Welcome to LogiSync!</h1>
            <p class='merchant-name'>Logistics Management System</p>
        </div>

        <div class='content'>
            <div class='welcome-section'>
                <span class='role-badge'>{$roleName}</span>
                <h2>Account Created</h2>
                <p>{$createdDate}</p>
            </div>

            <p style='color: #6b7280; font-size: 15px; line-height: 1.6;'>
                Hello <strong>{$username}</strong>,
            </p>

            <p style='color: #6b7280; font-size: 15px; line-height: 1.6; margin-top: 16px;'>
                Your administrator has created a LogiSync account for you with the role of <strong>{$roleName}</strong>.
                You can now access the system using the credentials below.
            </p>

            <div class='credentials-box'>
                {$credentialsRows}
            </div>

            <div style='text-align: center;'>
                <a href='{$loginUrl}' class='login-button'>Access LogiSync</a>
            </div>

            <hr class='divider'>

            <p style='color: #6b7280; font-size: 14px; line-height: 1.6;'>
                If you have any questions or need assistance, please contact your administrator.
            </p>
        </div>

        <div class='footer'>
            <p>LogiSync - Philippines</p>
        </div>
    </div>
</body>
</html>
";

        Mail::send([], [], function ($message) use ($email, $emailBody) {
            $message->to($email)
                ->subject('🎉 Welcome to LogiSync - Your Account Credentials')
                ->html($emailBody);
        });

        \Log::info("Credentials email sent to: {$email}");
    }

    private function sendRoleUpdateEmail($email, $username, $oldRole, $newRole)
    {
        $oldRoleName = $this->getRoleLabel($oldRole);
        $newRoleName = $this->getRoleLabel($newRole);
        $updatedDate = Carbon::now()->format('F d, Y h:i A');
        $loginUrl = config('app.url');

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
        .update-section {
            text-align: center;
            margin-bottom: 30px;
        }
        .update-section h2 {
            margin: 0 0 8px;
            font-size: 20px;
            color: #1a1a1a;
            font-weight: 600;
        }
        .update-section p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
        }
        .role-change-box {
            background: #f9fafb;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
        }
        .role-badge {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.5px;
            margin: 0 8px;
        }
        .old-role {
            background: #fee2e2;
            color: #991b1b;
            text-decoration: line-through;
        }
        .arrow {
            color: #6b7280;
            font-size: 20px;
            margin: 0 8px;
        }
        .new-role {
            background: #d1fae5;
            color: #065f46;
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
        .login-button {
            display: inline-block;
            background: #5469d4;
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 24px 0;
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
            <h1>Role Updated</h1>
            <p class='merchant-name'>LogiSync</p>
        </div>

        <div class='content'>
            <div class='update-section'>
                <h2>Your Role Has Been Changed</h2>
                <p>{$updatedDate}</p>
            </div>

            <p style='color: #6b7280; font-size: 15px; line-height: 1.6;'>
                Hello <strong>{$username}</strong>,
            </p>

            <p style='color: #6b7280; font-size: 15px; line-height: 1.6; margin-top: 16px;'>
                Your administrator has updated your role in the LogiSync system.
            </p>

            <div class='role-change-box'>
                <p style='color: #6b7280; font-size: 13px; margin-bottom: 12px; font-weight: 600;'>ROLE CHANGE</p>
                <div>
                    <span class='role-badge old-role'>{$oldRoleName}</span>
                    <span class='arrow'>→</span>
                    <span class='role-badge new-role'>{$newRoleName}</span>
                </div>
            </div>

            <div class='info-box'>
                <p>
                    <strong>What this means:</strong><br>
                    Your permissions and access level have been updated according to your new role.
                    Please log in to see your updated capabilities.
                </p>
            </div>

            <div style='text-align: center;'>
                <a href='{$loginUrl}' class='login-button'>Access LogiSync</a>
            </div>

            <hr class='divider'>

            <p style='color: #6b7280; font-size: 14px; line-height: 1.6;'>
                If you have any questions about your new role or permissions, please contact your administrator.
            </p>
        </div>

        <div class='footer'>
            <p>LogiSync - Philippines</p>
        </div>
    </div>
</body>
</html>
";

        Mail::send([], [], function ($message) use ($email, $emailBody) {
            $message->to($email)
                ->subject('🔄 Your LogiSync Role Has Been Updated')
                ->html($emailBody);
        });

        \Log::info("Role update email sent to: {$email} (Changed from {$oldRole} to {$newRole})");
    }

    private function sendAccountUpdateEmail($email, $oldUsername, $newUsername, $newPassword, $oldRole, $newRole, $roleChanged, $usernameChanged, $passwordChanged)
    {
        $newRoleName = $this->getRoleLabel($newRole);
        $oldRoleName = $this->getRoleLabel($oldRole);
        $updatedDate = Carbon::now()->format('F d, Y h:i A');
        $loginUrl = config('app.url');

        // Determine email subject/title
        $changes = [];
        if ($roleChanged) $changes[] = 'Role';
        if ($usernameChanged) $changes[] = 'Username';
        if ($passwordChanged) $changes[] = 'Password';
        $updateType = implode(' & ', $changes) . ' Updated';

        // Build role change section
        $roleSection = '';
        if ($roleChanged) {
            $roleSection = "
            <div class='role-change-box'>
                <p style='color: #6b7280; font-size: 13px; margin-bottom: 12px; font-weight: 600;'>ROLE CHANGE</p>
                <div>
                    <span class='role-badge old-role'>{$oldRoleName}</span>
                    <span class='arrow'>→</span>
                    <span class='role-badge new-role'>{$newRoleName}</span>
                </div>
            </div>";
        }

        // Build credentials section
        $credentialsSection = '';
        if ($usernameChanged || $passwordChanged) {
            $credentialRows = '';

            if ($usernameChanged) {
                $credentialRows .= "
                <div class='credential-row'>
                    <span class='credential-label'>Old Username</span>
                    <span class='credential-value old-value'>{$oldUsername}</span>
                </div>
                <div class='credential-row'>
                    <span class='credential-label'>New Username</span>
                    <span class='credential-value new-value'>{$newUsername}</span>
                </div>";
            } else {
                $credentialRows .= "
                <div class='credential-row'>
                    <span class='credential-label'>Username</span>
                    <span class='credential-value'>{$newUsername}</span>
                </div>";
            }

            if ($passwordChanged) {
                $credentialRows .= "
                <div class='credential-row'>
                    <span class='credential-label'>New Password</span>
                    <span class='credential-value new-value'>{$newPassword}</span>
                </div>";
            }

            $credentialsSection = "
            <div class='credentials-box'>
                {$credentialRows}
            </div>";
        }

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
        .update-section {
            text-align: center;
            margin-bottom: 30px;
        }
        .update-section h2 {
            margin: 0 0 8px;
            font-size: 20px;
            color: #1a1a1a;
            font-weight: 600;
        }
        .update-section p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
        }
        .role-badge {
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
        .credentials-box {
            background: #f9fafb;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
        }
        .credential-row {
            display: table;
            width: 100%;
            margin-bottom: 16px;
        }
        .credential-row:last-child {
            margin-bottom: 0;
        }
        .credential-label {
            display: table-cell;
            color: #6b7280;
            font-size: 14px;
            font-weight: 600;
            padding: 8px 0;
            width: 35%;
        }
        .credential-value {
            display: table-cell;
            color: #1a1a1a;
            font-size: 14px;
            font-family: monospace;
            background: white;
            padding: 10px 16px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
        }
        .old-value {
            background: #fee2e2;
            border-color: #fecaca;
            color: #991b1b;
            text-decoration: line-through;
        }
        .new-value {
            background: #d1fae5;
            border-color: #a7f3d0;
            color: #065f46;
            font-weight: 600;
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
        .login-button {
            display: inline-block;
            background: #5469d4;
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 24px 0;
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
            <h1>{$updateType}</h1>
            <p class='merchant-name'>LogiSync</p>
        </div>

        <div class='content'>
            <div class='update-section'>
                <span class='current-role-badge'>{$newRoleName}</span>
                <h2>Your Account Has Been Updated</h2>
                <p>{$updatedDate}</p>
            </div>

            <p style='color: #6b7280; font-size: 15px; line-height: 1.6;'>
                Hello <strong>{$newUsername}</strong>,
            </p>

            <p style='color: #6b7280; font-size: 15px; line-height: 1.6; margin-top: 16px;'>
                Your administrator has updated your account information. Please review the changes below.
            </p>

            {$roleSection}

            {$credentialsSection}

            <div class='warning-box'>
                <p>
                    <strong>⚠️ Security Notice:</strong><br>
                    Your account has been modified by your administrator. If you have any concerns about these changes, please contact your administrator immediately.
                </p>
            </div>

            <div class='info-box'>
                <p>
                    <strong>💡 Important:</strong><br>
                    " . ($passwordChanged ? "Please save your new password in a secure location. You will need it to access LogiSync." : "Please review the changes carefully and ensure you can still access your account.") . "
                </p>
            </div>

            <div style='text-align: center;'>
                <a href='{$loginUrl}' class='login-button'>Access LogiSync</a>
            </div>

            <hr class='divider'>

            <p style='color: #6b7280; font-size: 14px; line-height: 1.6;'>
                If you have any questions or concerns, please contact your administrator.
            </p>
        </div>

        <div class='footer'>
            <p>LogiSync - Philippines</p>
        </div>
    </div>
</body>
</html>
";

        Mail::send([], [], function ($message) use ($email, $emailBody, $updateType) {
            $message->to($email)
                ->subject("🔐 {$updateType} - LogiSync")
                ->html($emailBody);
        });

        $logChanges = [];
        if ($roleChanged) $logChanges[] = "role: {$oldRole} → {$newRole}";
        if ($usernameChanged) $logChanges[] = "username: {$oldUsername} → {$newUsername}";
        if ($passwordChanged) $logChanges[] = "password updated";
        \Log::info("Account update email sent to: {$email} (" . implode(', ', $logChanges) . ")");
    }
}
