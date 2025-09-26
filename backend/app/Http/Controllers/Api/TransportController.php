<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class TransportController extends Controller
{
    public function index()
    {
        $transports = DB::table('transport as t')
            ->leftJoin('users as d', 't.driver_id', '=', 'd.user_id')
            ->select(
                't.transport_id',
                't.vehicle_id',
                't.vehicle_type',
                't.registration_number',
                't.capacity',
                'd.username as driver_name'
            )
            ->get();

        $data = $transports->map(function ($t) {
            return [
                'id' => (int) $t->transport_id,
                'vehicle_id' => $t->vehicle_id,
                'vehicle_type' => $t->vehicle_type,
                'registration_number' => $t->registration_number,
                'capacity' => $t->capacity,
                'driver_name' => $t->driver_name ?? 'No driver assigned',
                'label' => "{$t->vehicle_id} ({$t->registration_number}) - {$t->vehicle_type}"
            ];
        });

        return response()->json([
            'data' => $data,
        ])->header('Access-Control-Allow-Origin', '*');
    }
}