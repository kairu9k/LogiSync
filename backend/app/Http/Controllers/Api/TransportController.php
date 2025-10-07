<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class TransportController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('transport as t')
            ->join('users as d', 't.driver_id', '=', 'd.user_id')
            ->leftJoin('budgets as b', 't.budget_id', '=', 'b.budget_id')
            ->leftJoin('schedules as s', 't.schedule_id', '=', 's.schedule_id')
            ->select(
                't.transport_id',
                't.vehicle_id',
                't.vehicle_type',
                't.registration_number',
                't.capacity',
                't.safety_compliance_details',
                'd.user_id as driver_id',
                'd.username as driver_name',
                'd.email as driver_email',
                'b.budget_name',
                's.schedule_name'
            );

        // Search by registration number or vehicle type
        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('t.registration_number', 'like', "%{$search}%")
                    ->orWhere('t.vehicle_type', 'like', "%{$search}%")
                    ->orWhere('d.username', 'like', "%{$search}%");
            });
        }

        $transports = $query->orderBy('t.transport_id', 'desc')->get();

        $data = $transports->map(function ($t) {
            return [
                'id' => (int) $t->transport_id,
                'vehicle_id' => $t->vehicle_id,
                'vehicle_type' => $t->vehicle_type,
                'registration_number' => $t->registration_number,
                'capacity' => $t->capacity,
                'safety_compliance' => $t->safety_compliance_details,
                'driver_id' => (int) $t->driver_id,
                'driver_name' => $t->driver_name,
                'driver_email' => $t->driver_email,
                'budget_name' => $t->budget_name ?? 'N/A',
                'schedule_name' => $t->schedule_name ?? 'N/A',
                'label' => "{$t->vehicle_id} ({$t->registration_number}) - {$t->vehicle_type}"
            ];
        });

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function show($id)
    {
        $transport = DB::table('transport as t')
            ->join('users as d', 't.driver_id', '=', 'd.user_id')
            ->leftJoin('budgets as b', 't.budget_id', '=', 'b.budget_id')
            ->leftJoin('schedules as s', 't.schedule_id', '=', 's.schedule_id')
            ->where('t.transport_id', $id)
            ->select(
                't.transport_id',
                't.vehicle_id',
                't.vehicle_type',
                't.registration_number',
                't.capacity',
                't.safety_compliance_details',
                't.driver_id',
                't.budget_id',
                't.schedule_id',
                'd.username as driver_name',
                'b.budget_name',
                's.schedule_name'
            )
            ->first();

        if (!$transport) {
            return response()->json(['message' => 'Transport not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json(['data' => [
            'id' => (int) $transport->transport_id,
            'vehicle_id' => $transport->vehicle_id,
            'vehicle_type' => $transport->vehicle_type,
            'registration_number' => $transport->registration_number,
            'capacity' => $transport->capacity,
            'safety_compliance' => $transport->safety_compliance_details,
            'driver_id' => (int) $transport->driver_id,
            'driver_name' => $transport->driver_name,
            'budget_id' => (int) $transport->budget_id,
            'schedule_id' => (int) $transport->schedule_id,
            'budget_name' => $transport->budget_name ?? 'N/A',
            'schedule_name' => $transport->schedule_name ?? 'N/A',
        ]])->header('Access-Control-Allow-Origin', '*');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'vehicle_id' => 'required|string|max:255',
            'vehicle_type' => 'required|string|max:255',
            'registration_number' => 'required|string|max:255|unique:transport,registration_number',
            'capacity' => 'required|string|max:255',
            'safety_compliance' => 'nullable|boolean',
            'driver_id' => 'required|integer|exists:users,user_id',
            'budget_id' => 'required|integer|exists:budgets,budget_id',
            'schedule_id' => 'required|integer|exists:schedules,schedule_id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Convert boolean to text
        $safetyCompliance = $request->safety_compliance ? 'Verified' : null;

        $id = DB::table('transport')->insertGetId([
            'vehicle_id' => $request->vehicle_id,
            'vehicle_type' => $request->vehicle_type,
            'registration_number' => $request->registration_number,
            'capacity' => $request->capacity,
            'safety_compliance_details' => $safetyCompliance,
            'driver_id' => $request->driver_id,
            'budget_id' => $request->budget_id,
            'schedule_id' => $request->schedule_id,
        ]);

        return response()->json([
            'message' => 'Transport created successfully',
            'data' => ['id' => $id]
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }

    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'vehicle_id' => 'required|string|max:255',
            'vehicle_type' => 'required|string|max:255',
            'registration_number' => 'required|string|max:255|unique:transport,registration_number,' . $id . ',transport_id',
            'capacity' => 'required|string|max:255',
            'safety_compliance' => 'nullable|boolean',
            'driver_id' => 'required|integer|exists:users,user_id',
            'budget_id' => 'required|integer|exists:budgets,budget_id',
            'schedule_id' => 'required|integer|exists:schedules,schedule_id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Convert boolean to text
        $safetyCompliance = $request->safety_compliance ? 'Verified' : null;

        $updated = DB::table('transport')->where('transport_id', $id)->update([
            'vehicle_id' => $request->vehicle_id,
            'vehicle_type' => $request->vehicle_type,
            'registration_number' => $request->registration_number,
            'capacity' => $request->capacity,
            'safety_compliance_details' => $safetyCompliance,
            'driver_id' => $request->driver_id,
            'budget_id' => $request->budget_id,
            'schedule_id' => $request->schedule_id,
        ]);

        if (!$updated) {
            return response()->json(['message' => 'Transport not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json(['message' => 'Transport updated successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function destroy($id)
    {
        $deleted = DB::table('transport')->where('transport_id', $id)->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Transport not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json(['message' => 'Transport deleted successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    // Helper endpoints for dropdowns
    public function getDrivers()
    {
        $drivers = DB::table('users')
            ->where('role', 'driver')
            ->select('user_id as id', 'username', 'email')
            ->get();

        return response()->json(['data' => $drivers])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function getBudgets()
    {
        $budgets = DB::table('budgets')
            ->select('budget_id as id', 'budget_name', 'total_budget')
            ->get();

        return response()->json(['data' => $budgets])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function getSchedules()
    {
        $schedules = DB::table('schedules')
            ->select('schedule_id as id', 'schedule_name', 'start_time', 'end_time')
            ->get();

        return response()->json(['data' => $schedules])
            ->header('Access-Control-Allow-Origin', '*');
    }
}