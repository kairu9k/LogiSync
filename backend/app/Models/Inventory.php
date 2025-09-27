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
        'order_details_id',
    ];

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id', 'warehouse_id');
    }

    public function orderDetail(): BelongsTo
    {
        return $this->belongsTo(OrderDetail::class, 'order_details_id', 'order_details_id');
    }

    // Get full inventory item information with related data
    public function getFullDetailsAttribute(): array
    {
        $orderDetail = $this->orderDetail;
        $order = $orderDetail ? $orderDetail->order : null;
        $customer = $order ? $order->user : null;

        return [
            'inventory_id' => $this->inventory_id,
            'location' => $this->location_in_warehouse,
            'warehouse' => $this->warehouse ? $this->warehouse->warehouse_name : 'Unknown',
            'product_id' => $orderDetail ? $orderDetail->product_id : null,
            'quantity' => $orderDetail ? $orderDetail->quantity : 0,
            'order_id' => $order ? $order->order_id : null,
            'order_status' => $order ? $order->order_status : 'unknown',
            'customer' => $customer ? $customer->username : 'Unknown',
            'order_date' => $order ? $order->order_date : null,
        ];
    }

    public static function assignToWarehouse(int $orderDetailsId, int $warehouseId, string $location): self
    {
        return self::create([
            'warehouse_id' => $warehouseId,
            'location_in_warehouse' => $location,
            'order_details_id' => $orderDetailsId,
        ]);
    }

    public static function getItemsByStatus(string $status = null): \Illuminate\Database\Eloquent\Collection
    {
        $query = self::with(['warehouse', 'orderDetail.order.user']);

        if ($status) {
            $query->whereHas('orderDetail.order', function ($q) use ($status) {
                $q->where('order_status', $status);
            });
        }

        return $query->get();
    }

    public static function searchItems(string $search): \Illuminate\Database\Eloquent\Collection
    {
        return self::with(['warehouse', 'orderDetail.order.user'])
            ->where(function ($query) use ($search) {
                $query->where('location_in_warehouse', 'like', "%{$search}%")
                    ->orWhereHas('warehouse', function ($q) use ($search) {
                        $q->where('warehouse_name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('orderDetail', function ($q) use ($search) {
                        $q->where('product_id', 'like', "%{$search}%");
                    })
                    ->orWhereHas('orderDetail.order.user', function ($q) use ($search) {
                        $q->where('username', 'like', "%{$search}%");
                    });
            })
            ->get();
    }
}