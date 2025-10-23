<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inventory extends Model
{
    protected $table = 'inventory';
    protected $primaryKey = 'inventory_id';
    public $timestamps = false;

    protected $fillable = [
        'warehouse_id',
        'location_in_warehouse',
        'order_id',
    ];

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id', 'warehouse_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id', 'order_id');
    }

    // Get full inventory item information with related data
    public function getFullDetailsAttribute(): array
    {
        $order = $this->order;

        return [
            'inventory_id' => $this->inventory_id,
            'location' => $this->location_in_warehouse,
            'warehouse' => $this->warehouse ? $this->warehouse->warehouse_name : 'Unknown',
            'order_id' => $order ? $order->order_id : null,
            'po' => $order ? ($order->order_number ?? 'PO-' . str_pad($order->order_id, 5, '0', STR_PAD_LEFT)) : 'N/A',
            'order_status' => $order ? $order->order_status : 'unknown',
            'customer' => $order && $order->customer_name ? $order->customer_name : 'Unknown',
            'order_date' => $order ? $order->order_date : null,
        ];
    }

    public static function assignToWarehouse(int $orderId, int $warehouseId, string $location): self
    {
        return self::create([
            'warehouse_id' => $warehouseId,
            'location_in_warehouse' => $location,
            'order_id' => $orderId,
        ]);
    }

    public static function getItemsByStatus(string $status = null, $organizationId = null): \Illuminate\Database\Eloquent\Collection
    {
        $query = self::with(['warehouse', 'order.organization']);

        // Filter by organization through order relationship
        if ($organizationId) {
            $query->whereHas('order', function ($q) use ($organizationId) {
                $q->where('organization_id', $organizationId);
            });
        }

        if ($status) {
            $query->whereHas('order', function ($q) use ($status) {
                $q->where('order_status', $status);
            });
        }

        return $query->get();
    }

    public static function searchItems(string $search, $organizationId = null): \Illuminate\Database\Eloquent\Collection
    {
        // Check if search is a PO number format (PO-00001)
        $orderIdFromPO = null;
        if (preg_match('/^PO-0*(\d+)$/i', $search, $matches)) {
            $orderIdFromPO = (int) $matches[1];
        }

        $query = self::with(['warehouse', 'order.organization']);

        // Filter by organization through order relationship
        if ($organizationId) {
            $query->whereHas('order', function ($q) use ($organizationId) {
                $q->where('organization_id', $organizationId);
            });
        }

        return $query->where(function ($query) use ($search, $orderIdFromPO) {
                $query->where('location_in_warehouse', 'like', "%{$search}%")
                    ->orWhereHas('warehouse', function ($q) use ($search) {
                        $q->where('warehouse_name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('order', function ($q) use ($search, $orderIdFromPO) {
                        $q->where('order_id', 'like', "%{$search}%");
                        // Also search by extracted order ID from PO number
                        if ($orderIdFromPO !== null) {
                            $q->orWhere('order_id', $orderIdFromPO);
                        }
                    })
                    ->orWhereHas('order.organization', function ($q) use ($search) {
                        $q->where('username', 'like', "%{$search}%");
                    });
            })
            ->get();
    }
}
