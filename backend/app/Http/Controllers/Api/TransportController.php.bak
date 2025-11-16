<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\UserHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class TransportController extends Controller
{
    public function index(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $query = DB::table('transport as t')
            ->join('users as d', 't.driver_id', '=', 'd.user_id')
            ->leftJoin('budgets as b', 't.budget_id', '=', 'b.budget_id')
            ->leftJoin('schedules as s', 't.schedule_id', '=', 's.schedule_id')
            ->where('t.organization_id', $orgUserId)
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

        // Calculate current load for each vehicle
        $data = $transports->map(function ($t) {
            // Get total weight of active shipments for this vehicle
            $currentLoad = DB::table('shipments as s')
                ->join('orders as o', 's.order_id', '=', 'o.order_id')
                ->join('quotes as q', 'o.quote_id', '=', 'q.quote_id')
                ->where('s.transport_id', $t->transport_id)
                ->whereIn('s.status', ['pending', 'in_transit', 'out_for_delivery'])
                ->sum('q.weight');

            $currentLoad = $currentLoad ?? 0;
            $capacity = (float) $t->capacity;
            $availableCapacity = $capacity - $currentLoad;
            $utilizationPercent = $capacity > 0 ? round(($currentLoad / $capacity) * 100, 1) : 0;

            return [
                'id' => (int) $t->transport_id,
                'vehicle_id' => $t->vehicle_id,
                'vehicle_type' => $t->vehicle_type,
                'registration_number' => $t->registration_number,
                'capacity' => $capacity,
                'current_load' => round($currentLoad, 1),
                'available_capacity' => round($availableCapacity, 1),
                'utilization_percent' => $utilizationPercent,
                'safety_compliance' => $t->safety_compliance_details,
                'driver_id' => (int) $t->driver_id,
                'driver_name' => $t->driver_name,
                'driver_email' => $t->driver_email,
                'budget_name' => $t->budget_name ?? 'N/A',
                'schedule_name' => $t->schedule_name ?? 'N/A',
                'label' => "{$t->vehicle_id} ({$t->registration_number}) - {$t->vehicle_type} [{$currentLoad}kg / {$capacity}kg]"
            ];
        });

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function show($id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $transport = DB::table('transport as t')
            ->join('users as d', 't.driver_id', '=', 'd.user_id')
            ->leftJoin('budgets as b', 't.budget_id', '=', 'b.budget_id')
            ->leftJoin('schedules as s', 't.schedule_id', '=', 's.schedule_id')
            ->where('t.transport_id', $id)
            ->where('t.organization_id', $orgUserId)
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
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
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
            'organization_id' => $orgUserId,
        ]);

        return response()->json([
            'message' => 'Transport created successfully',
            'data' => ['id' => $id]
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }

    public function update(Request $request, $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
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

        $updated = DB::table('transport')
            ->where('transport_id', $id)
            ->where('organization_id', $orgUserId)
            ->update([
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
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $deleted = DB::table('transport')
            ->where('transport_id', $id)
            ->where('organization_id', $orgUserId)
            ->delete();

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
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);

        // Get the organization_id from the user
        $user = DB::table('users')->where('user_id', $userId)->first();
        $organizationId = $user ? $user->organization_id : null;

        if (!$organizationId) {
            return response()->json(['message' => 'User organization not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Get all drivers from the same organization
        $drivers = DB::table('users')
            ->where('role', 'driver')
            ->where('organization_id', $organizationId)
            ->select('user_id as id', 'username', 'email')
            ->get();

        return response()->json(['data' => $drivers])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function getBudgets()
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $budgets = DB::table('budgets')
            ->where('organization_id', $orgUserId)
            ->select('budget_id as id', 'budget_name', 'total_budget')
            ->get();

        return response()->json(['data' => $budgets])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function getSchedules()
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $schedules = DB::table('schedules')
            ->where('organization_id', $orgUserId)
            ->select('schedule_id as id', 'schedule_name', 'start_time', 'end_time')
            ->get();

        return response()->json(['data' => $schedules])
            ->header('Access-Control-Allow-Origin', '*');
    }
}