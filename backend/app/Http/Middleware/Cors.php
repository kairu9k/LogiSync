<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class Cors
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Get allowed origins from environment
        $frontendUrl = env('FRONTEND_URL', '');

        // Default allowed origins for local development
        $defaultOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',  // Vite default port
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
        ];

        // If FRONTEND_URL is set, parse it (supports comma-separated list)
        if ($frontendUrl) {
            $allowedOrigins = array_merge($defaultOrigins, explode(',', $frontendUrl));
        } else {
            $allowedOrigins = $defaultOrigins;
        }

        // Get the request origin
        $origin = $request->header('Origin');

        // Check if origin is allowed
        if ($origin && in_array($origin, $allowedOrigins)) {
            $allowOrigin = $origin;
        } elseif (in_array('*', $allowedOrigins)) {
            $allowOrigin = '*';
        } else {
            // For local development, allow localhost origins by default
            if (env('APP_ENV') === 'local' && $origin &&
                (str_starts_with($origin, 'http://localhost') || str_starts_with($origin, 'http://127.0.0.1'))) {
                $allowOrigin = $origin;
            } else {
                $allowOrigin = $allowedOrigins[0] ?? 'http://localhost:3000';
            }
        }

        // Handle preflight OPTIONS request
        if ($request->getMethod() === 'OPTIONS') {
            return response('', 200)
                ->header('Access-Control-Allow-Origin', $allowOrigin)
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Requested-With')
                ->header('Access-Control-Max-Age', '86400');
        }

        $response = $next($request);

        return $response
            ->header('Access-Control-Allow-Origin', $allowOrigin)
            ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Requested-With');
    }
}
