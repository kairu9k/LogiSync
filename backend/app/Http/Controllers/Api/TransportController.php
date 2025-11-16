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
            ->where('t.organization_id', $orgUserId)
            ->select(
                't.transport_id',
                't.vehicle_id',
                't.vehicle_type',
                't.registration_number',
                't.capacity',
                't.volume_capacity',
                't.safety_compliance_details'
            );

        // Search by registration number or vehicle type
        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('t.registration_number', 'like', "%{$search}%")
                    ->orWhere('t.vehicle_type', 'like', "%{$search}%");
            });
        }

        // If exclude_assigned parameter is true, exclude vehicles assigned to active shipments
        if ($request->query('exclude_assigned') === 'true') {
            $query->whereNotIn('t.transport_id', function($subquery) {
                $subquery->select('transport_id')
                    ->from('shipments')
                    ->whereNotNull('transport_id')
                    ->whereIn('status', ['pending', 'in_transit', 'out_for_delivery']);
            });
        }

        $transports = $query->orderBy('t.transport_id', 'desc')->get();

        // Calculate current load for each vehicle (both weight and volume)
        $data = $transports->map(function ($t) {
            // Get total weight and volume of active shipments for this vehicle
            $shipmentData = DB::table('shipments as s')
                ->join('shipment_details as sd', 's.shipment_id', '=', 'sd.shipment_id')
                ->join('orders as o', 'sd.order_id', '=', 'o.order_id')
                ->join('quotes as q', 'o.quote_id', '=', 'q.quote_id')
                ->where('s.transport_id', $t->transport_id)
                ->whereIn('s.status', ['pending', 'picked_up', 'in_transit', 'out_for_delivery'])
                ->selectRaw('
                    COALESCE(SUM(q.weight), 0) as total_weight,
                    COALESCE(SUM(
                        CASE
                            WHEN q.dimensions IS NOT NULL AND q.dimensions != ""
                            THEN (
                                CAST(SUBSTRING_INDEX(q.dimensions, "x", 1) AS DECIMAL(10,2)) *
                                CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(q.dimensions, "x", 2), "x", -1) AS DECIMAL(10,2)) *
                                CAST(SUBSTRING_INDEX(q.dimensions, "x", -1) AS DECIMAL(10,2))
                            ) / 1000000
                            ELSE 0
                        END
                    ), 0) as total_volume
                ')
                ->first();

            $currentWeightLoad = $shipmentData->total_weight ?? 0;
            $currentVolumeLoad = $shipmentData->total_volume ?? 0;

            $weightCapacity = (float) $t->capacity;
            $volumeCapacity = (float) ($t->volume_capacity ?? 0);

            $availableWeightCapacity = $weightCapacity - $currentWeightLoad;
            $availableVolumeCapacity = $volumeCapacity > 0 ? $volumeCapacity - $currentVolumeLoad : null;

            $weightUtilizationPercent = $weightCapacity > 0 ? round(($currentWeightLoad / $weightCapacity) * 100, 1) : 0;
            $volumeUtilizationPercent = $volumeCapacity > 0 ? round(($currentVolumeLoad / $volumeCapacity) * 100, 1) : 0;

            // Check if driver is currently on an active delivery and get driver info
            $activeShipment = DB::table('shipments as s')
                ->join('users as d', 's.driver_id', '=', 'd.user_id')
                ->where('s.transport_id', $t->transport_id)
                ->whereIn('s.status', ['in_transit', 'out_for_delivery'])
                ->select('d.username as driver_name', 'd.user_id as driver_id')
                ->first();

            $activeDeliveryCount = DB::table('shipments')
                ->where('transport_id', $t->transport_id)
                ->whereIn('status', ['in_transit', 'out_for_delivery'])
                ->count();

            $isOnActiveDelivery = $activeDeliveryCount > 0;

            return [
                'id' => (int) $t->transport_id,
                'vehicle_id' => $t->vehicle_id,
                'vehicle_type' => $t->vehicle_type,
                'registration_number' => $t->registration_number,
                // Weight capacity data
                'capacity' => $weightCapacity,
                'current_load' => round($currentWeightLoad, 1),
                'available_capacity' => round($availableWeightCapacity, 1),
                'utilization_percent' => $weightUtilizationPercent,
                // Volume capacity data
                'volume_capacity' => $volumeCapacity,
                'current_volume_load' => round($currentVolumeLoad, 2),
                'available_volume_capacity' => $availableVolumeCapacity !== null ? round($availableVolumeCapacity, 2) : null,
                'volume_utilization_percent' => $volumeUtilizationPercent,
                // Other data
                'safety_compliance' => $t->safety_compliance_details,
                'is_on_active_delivery' => $isOnActiveDelivery,
                'active_delivery_count' => $activeDeliveryCount,
                'driver_name' => $activeShipment ? $activeShipment->driver_name : null,
                'driver_id' => $activeShipment ? (int) $activeShipment->driver_id : null,
                'label' => "{$t->vehicle_id} ({$t->registration_number}) - {$t->vehicle_type} [{$currentWeightLoad}kg / {$weightCapacity}kg]"
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
            ->where('t.transport_id', $id)
            ->where('t.organization_id', $orgUserId)
            ->select(
                't.transport_id',
                't.vehicle_id',
                't.vehicle_type',
                't.registration_number',
                't.capacity',
                't.volume_capacity',
                't.safety_compliance_details'
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
            'volume_capacity' => $transport->volume_capacity,
            'safety_compliance' => $transport->safety_compliance_details
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
            'capacity' => 'required|numeric|min:0',
            'volume_capacity' => 'required|numeric|min:0',
            'safety_compliance' => 'nullable|boolean',
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
            'volume_capacity' => $request->volume_capacity,
            'safety_compliance_details' => $safetyCompliance,
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
            'capacity' => 'required|numeric|min:0',
            'volume_capacity' => 'required|numeric|min:0',
            'safety_compliance' => 'nullable|boolean',
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
            'volume_capacity' => $request->volume_capacity,
            'safety_compliance_details' => $safetyCompliance,
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
