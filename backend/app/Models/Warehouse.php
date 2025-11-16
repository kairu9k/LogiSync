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
        'capacity',
        'organization_id',
        'latitude',
        'longitude',
    ];

    public function inventory(): HasMany
    {
        return $this->hasMany(Inventory::class, 'warehouse_id', 'warehouse_id');
    }

    public function getAvailableSpaceAttribute(): int
    {
        // Calculate available space based on total capacity minus current inventory
        $currentItems = $this->inventory()->count();
        $maxCapacity = $this->capacity ?? 1000; // Use warehouse capacity or default to 1000
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

        $utilizations = $warehouses->map(function($w) {
            $capacity = $w->capacity ?? 1000;
            return $w->inventory_count > 0 ? ($w->inventory_count / $capacity) * 100 : 0;
        });

        return [
            'total_warehouses' => $warehouses->count(),
            'total_items' => $warehouses->sum(fn($w) => $w->inventory_count),
            'average_utilization' => $utilizations->average(),
            'warehouses_at_capacity' => $warehouses->filter(fn($w) => $w->available_space <= 50)->count(),
        ];
    }
}