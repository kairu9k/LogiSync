<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

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

        $id = DB::table('users')->insertGetId([
            'username' => $data['name'] ?? ($data['email'] ?? ''),
            'password' => Hash::make($data['password']),
            'role' => 'admin',
            'email' => $data['email'],
        ], 'user_id');

        return response()->json([
            'message' => 'Registered',
            'user_id' => $id,
        ], 201)->header('Access-Control-Allow-Origin', '*');
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

        return response()->json([
            'message' => 'OK',
            'user' => [
                'user_id' => $user->user_id ?? null,
                'email' => $user->email,
                'username' => $user->username ?? null,
            ],
            'token' => 'demo',
        ])->header('Access-Control-Allow-Origin', '*');
    }
}