<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shipment extends Model
{
    protected $table = 'shipments';
    protected $primaryKey = 'shipment_id';
    public $timestamps = false;

    protected $fillable = [
        'tracking_number',
        'receiver_name',
        'receiver_address',
        'origin_name',
        'origin_address',
        'destination_name',
        'destination_address',
        'charges',
        'status',
        'departure_date',
        'order_id',
        'transport_id',
    ];

    protected $casts = [
        'creation_date' => 'datetime',
        'departure_date' => 'date',
        'charges' => 'integer',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id', 'order_id');
    }

    public function transport(): BelongsTo
    {
        return $this->belongsTo(Transport::class, 'transport_id', 'transport_id');
    }

    public function trackingHistory(): HasMany
    {
        return $this->hasMany(TrackingHistory::class, 'shipment_id', 'shipment_id')
                    ->orderBy('timestamp', 'desc');
    }

    public function generateTrackingNumber(): string
    {
        do {
            $trackingNumber = 'LS' . strtoupper(uniqid()) . random_int(100, 999);
        } while (self::where('tracking_number', $trackingNumber)->exists());

        return $trackingNumber;
    }

    public function addTrackingUpdate(string $location, string $status, ?string $details = null): void
    {
        $this->trackingHistory()->create([
            'location' => $location,
            'status' => $status,
            'details' => $details,
        ]);

        $this->update(['status' => $status]);
    }

    public function getLatestTrackingUpdate()
    {
        return $this->trackingHistory()->first();
    }
}