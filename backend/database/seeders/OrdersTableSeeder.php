<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OrdersTableSeeder extends Seeder
{
    public function run(): void
    {
        // Get the first organization
        $orgId = DB::table('organizations')->first()->organization_id ?? null;

        if (!$orgId) {
            echo "No organization found. Skipping orders seeder.\n";
            return;
        }

        // Seed three orders with different statuses
        $orders = [
            ['organization_id' => $orgId, 'order_status' => 'pending', 'customer_name' => 'Juan Dela Cruz'],
            ['organization_id' => $orgId, 'order_status' => 'processing', 'customer_name' => 'Maria Santos'],
            ['organization_id' => $orgId, 'order_status' => 'fulfilled', 'customer_name' => 'Pedro Garcia'],
        ];

        foreach ($orders as $o) {
            DB::table('orders')->updateOrInsert(
                [
                    'organization_id' => $o['organization_id'],
                    'order_status' => $o['order_status'],
                    'customer_name' => $o['customer_name'],
                ],
                ['order_date' => now()]
            );
        }
    }
}
