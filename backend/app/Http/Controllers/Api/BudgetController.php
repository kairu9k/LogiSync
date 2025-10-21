<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\UserHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class BudgetController extends Controller
{
    public function index(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $query = DB::table('budgets')->where('organization_id', $orgUserId);

        // Search functionality
        if ($search = $request->query('q')) {
            $query->where('budget_name', 'like', "%{$search}%");
        }

        $budgets = $query->orderBy('budget_id', 'desc')->get();

        $data = $budgets->map(function ($budget) {
            return [
                'id' => (int) $budget->budget_id,
                'budget_name' => $budget->budget_name,
                'start_date' => $budget->start_date,
                'end_date' => $budget->end_date,
                'total_budget' => (int) $budget->total_budget,
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
        $budget = DB::table('budgets')
            ->where('budget_id', $id)
            ->where('organization_id', $orgUserId)
            ->first();

        if (!$budget) {
            return response()->json(['message' => 'Budget not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json(['data' => [
            'id' => (int) $budget->budget_id,
            'budget_name' => $budget->budget_name,
            'start_date' => $budget->start_date,
            'end_date' => $budget->end_date,
            'total_budget' => (int) $budget->total_budget,
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
            'budget_name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'total_budget' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $id = DB::table('budgets')->insertGetId([
            'budget_name' => $request->budget_name,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'total_budget' => $request->total_budget,
            'organization_id' => $orgUserId,
        ]);

        return response()->json([
            'message' => 'Budget created successfully',
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
            'budget_name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'total_budget' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $updated = DB::table('budgets')
            ->where('budget_id', $id)
            ->where('organization_id', $orgUserId)
            ->update([
            'budget_name' => $request->budget_name,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'total_budget' => $request->total_budget,
        ]);

        if (!$updated) {
            return response()->json(['message' => 'Budget not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json(['message' => 'Budget updated successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function destroy($id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        // Check if budget is in use by any vehicles
        $inUse = DB::table('transport')
            ->where('budget_id', $id)
            ->where('organization_id', $orgUserId)
            ->exists();

        if ($inUse) {
            return response()->json([
                'message' => 'Cannot delete budget. It is currently assigned to one or more vehicles.'
            ], 400)->header('Access-Control-Allow-Origin', '*');
        }

        $deleted = DB::table('budgets')
            ->where('budget_id', $id)
            ->where('organization_id', $orgUserId)
            ->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Budget not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json(['message' => 'Budget deleted successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }
}
