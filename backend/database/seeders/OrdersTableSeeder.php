<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OrdersTableSeeder extends Seeder
{
    public function run(): void
    {
        $userAdmin = DB::table('users')->where('username', 'admin01')->value('user_id');
        $userWarehouse = DB::table('users')->where('username', 'warehouse_mgr')->value('user_id');
        $userDriver = DB::table('users')->where('username', 'driver01')->value('user_id');

        // Seed three orders linked to the users with specific statuses
        $orders = [
            ['user_id' => $userAdmin, 'order_status' => 'processing'],
            ['user_id' => $userWarehouse, 'order_status' => 'shipped'],
            ['user_id' => $userDriver, 'order_status' => 'delivered'],
        ];

        foreach ($orders as $o) {
            DB::table('orders')->updateOrInsert(
                [
                    'user_id' => $o['user_id'],
                    'order_status' => $o['order_status'],
                ],
                [] // order_date defaults to CURRENT_TIMESTAMP
            );
        }
    }
}
