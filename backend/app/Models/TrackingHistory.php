<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrackingHistory extends Model
{
    protected $table = 'tracking_history';
    protected $primaryKey = 'tracking_history_id';
    public $timestamps = false;

    protected $fillable = [
        'shipment_id',
        'tracking_id',
        'location',
        'status',
        'details',
    ];

    protected $casts = [
        'timestamp' => 'datetime',
    ];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(ShipmentDetail::class, 'tracking_id', 'tracking_id');
    }
}