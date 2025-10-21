<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $table = 'orders';
    protected $primaryKey = 'order_id';
    public $timestamps = false;

    protected $fillable = [
        'organization_id',
        'order_status',
        'order_date',
        'customer_name',
        'quote_id',
    ];

    protected $casts = [
        'order_date' => 'date',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organization_id', 'user_id');
    }

    public function shipment(): HasOne
    {
        return $this->hasOne(Shipment::class, 'order_id', 'order_id');
    }

    public function orderDetails(): HasMany
    {
        return $this->hasMany(OrderDetail::class, 'order_id', 'order_id');
    }

    public function inventory(): HasOne
    {
        return $this->hasOne(Inventory::class, 'order_id', 'order_id');
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class, 'quote_id', 'quote_id');
    }
}