<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transport extends Model
{
    protected $table = 'transport';
    protected $primaryKey = 'transport_id';
    public $timestamps = false;

    protected $fillable = [
        'vehicle_id',
        'vehicle_type',
        'registration_number',
        'capacity',
        'safety_compliance_details',
        'budget_id',
        'schedule_id',
        'driver_id',
    ];

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id', 'user_id');
    }

    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class, 'transport_id', 'transport_id');
    }
}