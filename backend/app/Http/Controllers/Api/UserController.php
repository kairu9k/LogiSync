<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $role = $request->query('role');
        $search = $request->query('q');

        // Show only team members created by this admin
        $query = DB::table('users')
            ->select('user_id', 'username', 'email', 'role', 'created_by')
            ->where('created_by', $userId)
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

        $user = DB::table('users')
            ->select('user_id', 'username', 'email', 'role')
            ->where('user_id', $id)
            ->where('created_by', $userId)
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

        return response()->json([
            'message' => 'User created successfully',
            'user_id' => $userId,
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }

    public function update(Request $request, int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $user = DB::table('users')
            ->where('user_id', $id)
            ->where('created_by', $userId)
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
        if (isset($data['username'])) {
            $updateData['username'] = $data['username'];
        }
        if (isset($data['email'])) {
            $updateData['email'] = $data['email'];
        }
        if (isset($data['role'])) {
            $updateData['role'] = $data['role'];
        }
        if (isset($data['password'])) {
            $updateData['password'] = Hash::make($data['password']);
        }

        if (!empty($updateData)) {
            DB::table('users')->where('user_id', $id)->update($updateData);
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

        $user = DB::table('users')
            ->where('user_id', $id)
            ->where('created_by', $userId)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        DB::table('users')
            ->where('user_id', $id)
            ->where('created_by', $userId)
            ->delete();

        return response()->json(['message' => 'User deleted successfully'])
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
}
