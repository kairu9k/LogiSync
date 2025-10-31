<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    // Get unassigned orders (packages waiting to be stored in warehouse)
    public static function getUnassignedItems($orgUserId = null)
    {
        // Get orders that are processing or fulfilled but not yet assigned to warehouse
        $query = Order::with('organization', 'quote')
            ->whereDoesntHave('inventory') // Orders not in inventory yet
            ->whereIn('order_status', ['processing', 'fulfilled']);

        // Filter by organization if provided
        if ($orgUserId) {
            $query->where('organization_id', $orgUserId);
        }

        return $query->get();
    }
}
