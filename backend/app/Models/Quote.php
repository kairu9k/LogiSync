<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Quote extends Model
{
    protected $table = 'quotes';
    protected $primaryKey = 'quote_id';
    public $timestamps = false;

    protected $fillable = [
        'organization_id',
        'customer_name',
        'customer_email',
        'pickup_location',
        'delivery_location',
        'weight',
        'dimensions',
        'distance',
        'estimated_cost',
        'quote_status',
        'quote_date',
        'quote_number',
        'created_by_user_id',
        'expiry_date',
        'status',
    ];

    protected $casts = [
        'quote_date' => 'date',
        'estimated_cost' => 'integer',
        'weight' => 'float',
        'distance' => 'float',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organization_id', 'user_id');
    }

    public function order(): HasOne
    {
        return $this->hasOne(Order::class, 'quote_id', 'quote_id');
    }
}
