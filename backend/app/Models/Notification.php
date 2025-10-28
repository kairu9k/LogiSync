<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $table = 'notifications';
    protected $primaryKey = 'notification_id';

    protected $fillable = [
        'organization_id',
        'user_id',
        'type',
        'category',
        'icon',
        'message',
        'link',
        'priority',
        'related_id',
        'read',
        'read_at',
    ];

    protected $casts = [
        'read' => 'boolean',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Create a notification
     */
    public static function createNotification(array $data): self
    {
        return self::create($data);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(): bool
    {
        $this->read = true;
        $this->read_at = now();
        return $this->save();
    }

    /**
     * Get unread notifications for an organization
     */
    public static function getUnreadForOrganization(int $organizationId, ?int $userId = null, int $limit = 50)
    {
        $query = self::where('organization_id', $organizationId)
            ->where('read', false)
            ->orderByDesc('created_at')
            ->limit($limit);

        if ($userId) {
            $query->where(function ($q) use ($userId) {
                $q->whereNull('user_id')
                  ->orWhere('user_id', $userId);
            });
        }

        return $query->get();
    }

    /**
     * Get all notifications for an organization (with pagination)
     */
    public static function getAllForOrganization(int $organizationId, ?int $userId = null, int $limit = 100)
    {
        $query = self::where('organization_id', $organizationId)
            ->orderByDesc('created_at')
            ->limit($limit);

        if ($userId) {
            $query->where(function ($q) use ($userId) {
                $q->whereNull('user_id')
                  ->orWhere('user_id', $userId);
            });
        }

        return $query->get();
    }

    /**
     * Mark all notifications as read for an organization
     */
    public static function markAllAsReadForOrganization(int $organizationId, ?int $userId = null): int
    {
        $query = self::where('organization_id', $organizationId)
            ->where('read', false);

        if ($userId) {
            $query->where(function ($q) use ($userId) {
                $q->whereNull('user_id')
                  ->orWhere('user_id', $userId);
            });
        }

        return $query->update([
            'read' => true,
            'read_at' => now()
        ]);
    }
}
