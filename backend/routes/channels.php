<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// Channel for shipment updates - only accessible by users in the same organization
Broadcast::channel('shipment.{shipmentId}', function ($user, $shipmentId) {
    $shipment = \App\Models\Shipment::with('order')->find($shipmentId);

    if (!$shipment || !$shipment->order) {
        return false;
    }

    // Allow access if user belongs to the same organization
    return $user->organization_id === $shipment->order->organization_id;
});

// Channel for organization-wide notifications
Broadcast::channel('organization.{organizationId}', function ($user, $organizationId) {
    // User can only listen to their own organization's channel
    return (int) $user->organization_id === (int) $organizationId;
});

// Channel for driver-specific updates
Broadcast::channel('driver.{userId}', function ($user, $userId) {
    // Drivers can only listen to their own channel
    return (int) $user->user_id === (int) $userId;
});

// Channel for warehouse updates
Broadcast::channel('warehouse.{warehouseId}', function ($user, $warehouseId) {
    $warehouse = \App\Models\Warehouse::find($warehouseId);

    if (!$warehouse) {
        return false;
    }

    // Allow access if user belongs to the same organization
    return $user->organization_id === $warehouse->organization_id;
});
