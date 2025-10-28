<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\UserHelper;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get unread notifications for the authenticated user's organization
     */
    public function getUnread(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $notifications = Notification::getUnreadForOrganization($orgUserId, null, 50);

        return response()->json([
            'data' => $notifications,
            'count' => $notifications->count()
        ])->header('Access-Control-Allow-Origin', '*');
    }

    /**
     * Get all notifications (read and unread) with limit
     */
    public function index(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $limit = (int) ($request->query('limit', 100));
        $limit = max(1, min($limit, 200));

        $notifications = Notification::getAllForOrganization($orgUserId, null, $limit);

        return response()->json([
            'data' => $notifications,
            'count' => $notifications->count(),
            'unread_count' => $notifications->where('read', false)->count()
        ])->header('Access-Control-Allow-Origin', '*');
    }

    /**
     * Mark a specific notification as read
     */
    public function markAsRead(Request $request, int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);

        $notification = Notification::where('notification_id', $id)
            ->where('organization_id', $orgUserId)
            ->first();

        if (!$notification) {
            return response()->json(['message' => 'Notification not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $notification->markAsRead();

        return response()->json([
            'message' => 'Notification marked as read',
            'notification' => $notification
        ])->header('Access-Control-Allow-Origin', '*');
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $count = Notification::markAllAsReadForOrganization($orgUserId);

        return response()->json([
            'message' => 'All notifications marked as read',
            'count' => $count
        ])->header('Access-Control-Allow-Origin', '*');
    }

    /**
     * Delete/dismiss a notification
     */
    public function destroy(Request $request, int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);

        $notification = Notification::where('notification_id', $id)
            ->where('organization_id', $orgUserId)
            ->first();

        if (!$notification) {
            return response()->json(['message' => 'Notification not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $notification->delete();

        return response()->json([
            'message' => 'Notification dismissed'
        ])->header('Access-Control-Allow-Origin', '*');
    }

    /**
     * Clear all read notifications (cleanup)
     */
    public function clearRead(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $count = Notification::where('organization_id', $orgUserId)
            ->where('read', true)
            ->delete();

        return response()->json([
            'message' => 'Read notifications cleared',
            'count' => $count
        ])->header('Access-Control-Allow-Origin', '*');
    }
}
