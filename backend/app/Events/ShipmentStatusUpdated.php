<?php

namespace App\Events;

use App\Models\Shipment;
use App\Models\Notification;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ShipmentStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $shipment;
    public $oldStatus;
    public $newStatus;
    public $updatedBy;

    /**
     * Create a new event instance.
     */
    public function __construct(Shipment $shipment, $oldStatus, $newStatus, $updatedBy)
    {
        $this->shipment = $shipment->load(['order.organization', 'transport.driver']);
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
        $organizationId = $this->shipment->order->organization_id ?? null;
        if (!$organizationId) {
            return;
        }

        // Only create notifications for significant status changes
        $notifiableStatuses = ['out_for_delivery', 'delivered', 'cancelled'];
        if (!in_array($this->newStatus, $notifiableStatuses)) {
            return;
        }

        $notificationData = $this->getNotificationData();
        if (!$notificationData) {
            return;
        }

        Notification::create([
            'organization_id' => $organizationId,
            'user_id' => null, // Broadcast to all users in org
            'type' => $notificationData['type'],
            'category' => 'shipment',
            'icon' => $notificationData['icon'],
            'message' => $notificationData['message'],
            'link' => "/app/shipments/{$this->shipment->shipment_id}",
            'priority' => $notificationData['priority'],
            'related_id' => $this->shipment->shipment_id,
        ]);
    }

    /**
     * Get notification data based on status
     */
    private function getNotificationData(): ?array
    {
        switch ($this->newStatus) {
            case 'out_for_delivery':
                return [
                    'type' => 'info',
                    'icon' => '🚚',
                    'message' => "Shipment {$this->shipment->tracking_number} is out for delivery",
                    'priority' => 'medium'
                ];
            case 'delivered':
                return [
                    'type' => 'success',
                    'icon' => '✅',
                    'message' => "Shipment {$this->shipment->tracking_number} has been delivered successfully",
                    'priority' => 'low'
                ];
            case 'cancelled':
                return [
                    'type' => 'warning',
                    'icon' => '❌',
                    'message' => "Shipment {$this->shipment->tracking_number} has been cancelled",
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
        $organizationId = $this->shipment->order->organization_id ?? null;
        $driverId = $this->shipment->transport->driver_id ?? null;

        $channels = [
            // Broadcast to organization channel (all admins/staff)
            // Using public channel for now (TODO: implement private channel auth)
            new Channel('organization.' . $organizationId),

            // Broadcast to shipment-specific channel
            new Channel('shipment.' . $this->shipment->shipment_id),
        ];

        // Broadcast to driver if assigned
        if ($driverId) {
            $channels[] = new Channel('driver.' . $driverId);
        }

        return $channels;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'shipment.status.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        $driver = $this->shipment->transport && $this->shipment->transport->driver
            ? $this->shipment->transport->driver
            : null;

        return [
            'shipment_id' => $this->shipment->shipment_id,
            'tracking_number' => $this->shipment->tracking_number,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'receiver_name' => $this->shipment->receiver_name,
            'driver' => $driver ? [
                'user_id' => $driver->user_id,
                'username' => $driver->username,
            ] : null,
            'updated_by' => $this->updatedBy,
            'updated_at' => $this->shipment->updated_at
                ? $this->shipment->updated_at->toDateTimeString()
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
            'pending' => 'Shipment is pending pickup',
            'processing' => 'Shipment is being processed',
            'in_transit' => 'Shipment is on the way',
            'out_for_delivery' => 'Shipment is out for delivery',
            'delivered' => 'Shipment has been delivered',
            'failed' => 'Delivery attempt failed',
            'returned' => 'Shipment has been returned',
            'cancelled' => 'Shipment has been cancelled',
        ];

        return $messages[$this->newStatus] ?? 'Shipment status updated';
    }
}
