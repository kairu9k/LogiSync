<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WarehouseSeeder extends Seeder
{
    public function run(): void
    {
        // Create warehouses
        $warehouses = [
            [
                'warehouse_name' => 'Main Distribution Center',
                'location' => 'Davao City, Philippines - Industrial Zone A, Building 1',
            ],
            [
                'warehouse_name' => 'Manila Regional Hub',
                'location' => 'Manila, Philippines - Port Area, Warehouse Complex B',
            ],
            [
                'warehouse_name' => 'Cebu Storage Facility',
                'location' => 'Cebu City, Philippines - Business District, Storage Unit C',
            ],
            [
                'warehouse_name' => 'Northern Luzon Depot',
                'location' => 'Baguio, Philippines - Mountain View Industrial Park',
            ],
        ];

        foreach ($warehouses as $warehouse) {
            DB::table('warehouse')->insert($warehouse);
        }

        // Create some order details for inventory management
        $orderDetails = [
            ['order_id' => 1, 'product_id' => 101, 'quantity' => 50],
            ['order_id' => 1, 'product_id' => 102, 'quantity' => 25],
            ['order_id' => 2, 'product_id' => 103, 'quantity' => 30],
            ['order_id' => 2, 'product_id' => 104, 'quantity' => 15],
            ['order_id' => 3, 'product_id' => 105, 'quantity' => 40],
            ['order_id' => 1, 'product_id' => 106, 'quantity' => 20],
            ['order_id' => 2, 'product_id' => 107, 'quantity' => 35],
            ['order_id' => 3, 'product_id' => 108, 'quantity' => 60],
        ];

        foreach ($orderDetails as $detail) {
            DB::table('order_details')->insert($detail);
        }

        // Create inventory assignments
        $inventoryItems = [
            [
                'warehouse_id' => 1,
                'location_in_warehouse' => 'Section A, Shelf 1-A',
                'order_details_id' => 1,
            ],
            [
                'warehouse_id' => 1,
                'location_in_warehouse' => 'Section A, Shelf 1-B',
                'order_details_id' => 2,
            ],
            [
                'warehouse_id' => 2,
                'location_in_warehouse' => 'Zone B, Rack 2-A',
                'order_details_id' => 3,
            ],
            [
                'warehouse_id' => 2,
                'location_in_warehouse' => 'Zone B, Rack 2-B',
                'order_details_id' => 4,
            ],
            [
                'warehouse_id' => 3,
                'location_in_warehouse' => 'Bay C, Level 3-A',
                'order_details_id' => 5,
            ],
            [
                'warehouse_id' => 1,
                'location_in_warehouse' => 'Section A, Shelf 1-C',
                'order_details_id' => 6,
            ],
        ];

        foreach ($inventoryItems as $item) {
            DB::table('inventory')->insert($item);
        }

        echo "Warehouse seeder completed: Created 4 warehouses, 8 order details, and 6 inventory assignments.\n";
    }
}