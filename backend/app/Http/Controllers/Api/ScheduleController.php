<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\UserHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ScheduleController extends Controller
{
    public function index(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $query = DB::table('schedules')->where('organization_id', $orgUserId);

        // Search functionality
        if ($search = $request->query('q')) {
            $query->where('schedule_name', 'like', "%{$search}%");
        }

        $schedules = $query->orderBy('schedule_id', 'desc')->get();

        $data = $schedules->map(function ($schedule) {
            return [
                'id' => (int) $schedule->schedule_id,
                'schedule_name' => $schedule->schedule_name,
                'start_time' => $schedule->start_time,
                'end_time' => $schedule->end_time,
                'route_details' => $schedule->route_details,
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
        $schedule = DB::table('schedules')
            ->where('schedule_id', $id)
            ->where('organization_id', $orgUserId)
            ->first();

        if (!$schedule) {
            return response()->json(['message' => 'Schedule not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json(['data' => [
            'id' => (int) $schedule->schedule_id,
            'schedule_name' => $schedule->schedule_name,
            'start_time' => $schedule->start_time,
            'end_time' => $schedule->end_time,
            'route_details' => $schedule->route_details,
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
            'schedule_name' => 'required|string|max:255',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'route_details' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $id = DB::table('schedules')->insertGetId([
            'schedule_name' => $request->schedule_name,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'route_details' => $request->route_details,
            'user_id' => $orgUserId,
        ]);

        return response()->json([
            'message' => 'Schedule created successfully',
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
            'schedule_name' => 'required|string|max:255',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'route_details' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $updated = DB::table('schedules')
            ->where('schedule_id', $id)
            ->where('organization_id', $orgUserId)
            ->update([
            'schedule_name' => $request->schedule_name,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'route_details' => $request->route_details,
        ]);

        if (!$updated) {
            return response()->json(['message' => 'Schedule not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json(['message' => 'Schedule updated successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function destroy($id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        // Check if schedule is in use by any vehicles
        $inUse = DB::table('transport')
            ->where('schedule_id', $id)
            ->where('organization_id', $orgUserId)
            ->exists();

        if ($inUse) {
            return response()->json([
                'message' => 'Cannot delete schedule. It is currently assigned to one or more vehicles.'
            ], 400)->header('Access-Control-Allow-Origin', '*');
        }

        $deleted = DB::table('schedules')
            ->where('schedule_id', $id)
            ->where('organization_id', $orgUserId)
            ->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Schedule not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json(['message' => 'Schedule deleted successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }
}
