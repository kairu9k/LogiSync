<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShipmentDetail extends Model
{
    protected $table = 'shipment_details';
    protected $primaryKey = 'tracking_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'tracking_id',
        'shipment_id',
        'order_id',
        'receiver_name',
        'receiver_contact',
        'receiver_email',
        'receiver_address',
        'charges',
        'status',
    ];

    protected $casts = [
        'charges' => 'integer',
        'created_at' => 'datetime',
    ];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id', 'order_id');
    }

    public function trackingHistory(): HasMany
    {
        return $this->hasMany(TrackingHistory::class, 'tracking_id', 'tracking_id');
    }
}
