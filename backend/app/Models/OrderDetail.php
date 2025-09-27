<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class OrderDetail extends Model
{
    protected $table = 'order_details';
    protected $primaryKey = 'order_details_id';
    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'product_id',
        'quantity',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id', 'order_id');
    }

    public function inventory(): HasOne
    {
        return $this->hasOne(Inventory::class, 'order_details_id', 'order_details_id');
    }

    public function getFormattedProductIdAttribute(): string
    {
        return 'PROD-' . str_pad((string) $this->product_id, 4, '0', STR_PAD_LEFT);
    }

    public function getTotalValueAttribute(): float
    {
        // This would be calculated based on product price if we had a products table
        // For now, we'll use a default value per unit
        $unitPrice = 100; // Default unit price in cents
        return $this->quantity * $unitPrice;
    }

    public function getStatusAttribute(): string
    {
        if ($this->inventory) {
            return 'stored';
        }

        return match($this->order->order_status) {
            'pending' => 'awaiting_storage',
            'processing' => 'ready_for_storage',
            'fulfilled' => 'ready_to_ship',
            'shipped' => 'shipped',
            default => 'unknown'
        };
    }

    public static function getUnassignedItems()
    {
        return self::with('order.user')
            ->whereDoesntHave('inventory')
            ->whereHas('order', function ($query) {
                $query->whereIn('order_status', ['processing', 'fulfilled']);
            })
            ->get();
    }
}