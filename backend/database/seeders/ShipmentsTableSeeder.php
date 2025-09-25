<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ShipmentsTableSeeder extends Seeder
{
    public function run(): void
    {
        // Resolve orders by username + status to get consistent IDs across environments
        $order1 = DB::table('orders as o')
            ->join('users as u', 'u.user_id', '=', 'o.user_id')
            ->where('u.username', 'admin01')
            ->where('o.order_status', 'processing')
            ->value('o.order_id');

        $order2 = DB::table('orders as o')
            ->join('users as u', 'u.user_id', '=', 'o.user_id')
            ->where('u.username', 'warehouse_mgr')
            ->where('o.order_status', 'shipped')
            ->value('o.order_id');

        // Resolve transports by registration number
        $transport1 = DB::table('transport')->where('registration_number', 'ABC-1234')->value('transport_id');
        $transport2 = DB::table('transport')->where('registration_number', 'XYZ-5678')->value('transport_id');

        DB::table('shipments')->updateOrInsert(
            ['tracking_number' => 'LS2024001'],
            [
                'receiver_name' => 'Juan Dela Cruz',
                'receiver_address' => 'Quezon City, Metro Manila',
                'origin_name' => 'Davao Warehouse',
                'origin_address' => 'Davao City, Philippines',
                'destination_name' => 'Manila Hub',
                'destination_address' => 'Manila, Philippines',
                'charges' => 1500,
                'status' => 'in_transit',
                'departure_date' => '2024-01-16',
                'order_id' => $order1,
                'transport_id' => $transport1,
            ]
        );

        DB::table('shipments')->updateOrInsert(
            ['tracking_number' => 'LS2024002'],
            [
                'receiver_name' => 'Maria Santos',
                'receiver_address' => 'Cebu City, Philippines',
                'origin_name' => 'Manila Hub',
                'origin_address' => 'Manila, Philippines',
                'destination_name' => 'Cebu Distribution',
                'destination_address' => 'Cebu City, Philippines',
                'charges' => 2800,
                'status' => 'delivered',
                'departure_date' => '2024-01-21',
                'order_id' => $order2,
                'transport_id' => $transport2,
            ]
        );
    }
}
