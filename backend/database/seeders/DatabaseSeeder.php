<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            // Important base data - must run first
            SubscriptionPlansSeeder::class,

            // Demo/test data
            UsersTableSeeder::class,
            SchedulesTableSeeder::class,
            BudgetsTableSeeder::class,
            TransportTableSeeder::class,
            OrdersTableSeeder::class,
            ShipmentsTableSeeder::class,
            TrackingHistoryTableSeeder::class,
            InvoiceSeeder::class,
        ]);
    }
}
