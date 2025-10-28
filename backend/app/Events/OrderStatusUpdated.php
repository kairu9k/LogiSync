<?php

namespace App\Events;

use App\Models\Order;
use App\Models\Notification;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $order;
    public $oldStatus;
    public $newStatus;
    public $updatedBy;

    /**
     * Create a new event instance.
     */
    public function __construct(Order $order, $oldStatus, $newStatus, $updatedBy)
    {
        $this->order = $order->load(['organization', 'quote']);
        $this->oldStatus = $oldStatus;
        $this->newStatus = $newStatus;
        $this->updatedBy = $updatedBy;

        // Create notification for important status changes
        $this->createNotification();
    }

    /**
     * Create a notification for this status change
     */
    private function createNotification()
    {
        $organizationId = $this->order->organization_id ?? null;
        if (!$organizationId) {
            return;
        }

        // Only create notifications for significant status changes
        $notifiableStatuses = ['processing', 'fulfilled', 'cancelled'];
        if (!in_array($this->newStatus, $notifiableStatuses)) {
            return;
        }

        $notificationData = $this->getNotificationData();
        if (!$notificationData) {
            return;
        }

        Notification::create([
            'organization_id' => $organizationId,
            'user_id' => null,
            'type' => $notificationData['type'],
            'category' => 'order',
            'icon' => $notificationData['icon'],
            'message' => $notificationData['message'],
            'link' => "/app/orders/{$this->order->order_id}",
            'priority' => $notificationData['priority'],
            'related_id' => $this->order->order_id,
        ]);
    }

    /**
     * Get notification data based on status
     */
    private function getNotificationData(): ?array
    {
        $customerName = $this->order->customer_name ?? 'Customer';
        $po = $this->order->po ?? 'Order';

        switch ($this->newStatus) {
            case 'processing':
                return [
                    'type' => 'info',
                    'icon' => '⚙️',
                    'message' => "Order {$po} for {$customerName} is now being processed",
                    'priority' => 'medium'
                ];
            case 'fulfilled':
                return [
                    'type' => 'success',
                    'icon' => '✅',
                    'message' => "Order {$po} for {$customerName} has been fulfilled",
                    'priority' => 'medium'
                ];
            case 'cancelled':
                return [
                    'type' => 'warning',
                    'icon' => '❌',
                    'message' => "Order {$po} for {$customerName} has been cancelled",
                    'priority' => 'high'
                ];
            default:
                return null;
        }
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $organizationId = $this->order->organization_id ?? null;

        $channels = [
            // Broadcast to organization channel (all admins/staff)
            new Channel('organization.' . $organizationId),

            // Broadcast to order-specific channel
            new Channel('order.' . $this->order->order_id),
        ];

        return $channels;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'order.status.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'order_id' => $this->order->order_id,
            'po' => $this->order->po,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'customer_name' => $this->order->customer_name,
            'updated_by' => $this->updatedBy,
            'updated_at' => $this->order->updated_at
                ? $this->order->updated_at->toDateTimeString()
                : now()->toDateTimeString(),
            'message' => $this->getStatusMessage(),
        ];
    }

    /**
     * Get a user-friendly message based on status change
     */
    private function getStatusMessage(): string
    {
        $messages = [
            'pending' => 'Order is pending processing',
            'processing' => 'Order is being processed',
            'fulfilled' => 'Order has been fulfilled',
            'cancelled' => 'Order has been cancelled',
        ];

        return $messages[$this->newStatus] ?? 'Order status updated';
    }
}
