<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Warehouse extends Model
{
    protected $table = 'warehouse';
    protected $primaryKey = 'warehouse_id';
    public $timestamps = false;

    protected $fillable = [
        'warehouse_name',
        'location',
        'organization_id',
    ];

    public function inventory(): HasMany
    {
        return $this->hasMany(Inventory::class, 'warehouse_id', 'warehouse_id');
    }

    public function getAvailableSpaceAttribute(): int
    {
        // Calculate available space based on total capacity minus current inventory
        $currentItems = $this->inventory()->count();
        $maxCapacity = 1000; // Default capacity per warehouse
        return max(0, $maxCapacity - $currentItems);
    }

    public function getInventoryCountAttribute(): int
    {
        return $this->inventory()->count();
    }

    public static function getWarehouseStats($organizationId = null)
    {
        $query = self::with('inventory');

        // Filter by organization if provided
        if ($organizationId) {
            $query->where('organization_id', $organizationId);
        }

        $warehouses = $query->get();

        return [
            'total_warehouses' => $warehouses->count(),
            'total_items' => $warehouses->sum(fn($w) => $w->inventory_count),
            'average_utilization' => $warehouses->avg(fn($w) =>
                $w->inventory_count > 0 ? ($w->inventory_count / 1000) * 100 : 0
            ),
            'warehouses_at_capacity' => $warehouses->filter(fn($w) => $w->available_space <= 50)->count(),
        ];
    }
}