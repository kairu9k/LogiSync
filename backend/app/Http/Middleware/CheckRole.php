<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles  Allowed roles for this route
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        // Get user_id from session or request header
        $userId = $request->header('X-User-Id') ?? session('user_id');

        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - Please login'], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Fetch user from database
        $user = DB::table('users')->where('user_id', $userId)->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Check if user role is in allowed roles
        if (!in_array($user->role, $roles)) {
            return response()->json([
                'message' => 'Forbidden - Insufficient permissions',
                'required_role' => $roles,
                'your_role' => $user->role
            ], 403)->header('Access-Control-Allow-Origin', '*');
        }

        // Attach user to request for use in controllers (convert to array for Laravel 12 compatibility)
        $request->merge(['auth_user' => (array) $user]);

        return $next($request);
    }
}
