<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TrackingHistoryTableSeeder extends Seeder
{
    public function run(): void
    {
        $shipment1 = DB::table('shipments')->where('tracking_number', 'LS2024001')->value('shipment_id');
        $shipment2 = DB::table('shipments')->where('tracking_number', 'LS2024002')->value('shipment_id');

        $rows = [
            [
                'shipment_id' => $shipment1,
                'location' => 'Davao Warehouse',
                'status' => 'picked_up',
                'details' => 'Package picked up by driver',
                'timestamp' => '2024-01-16 08:30:00',
            ],
            [
                'shipment_id' => $shipment1,
                'location' => 'Davao Port',
                'status' => 'in_transit',
                'details' => 'Loaded onto ferry to Manila',
                'timestamp' => '2024-01-16 10:00:00',
            ],
            [
                'shipment_id' => $shipment1,
                'location' => 'Manila Port',
                'status' => 'in_transit',
                'details' => 'Arrived at Manila port, transferred to truck',
                'timestamp' => '2024-01-17 06:30:00',
            ],
            [
                'shipment_id' => $shipment1,
                'location' => 'Manila Hub',
                'status' => 'in_transit',
                'details' => 'Package sorted at distribution center',
                'timestamp' => '2024-01-17 08:00:00',
            ],
            [
                'shipment_id' => $shipment2,
                'location' => 'Manila Hub',
                'status' => 'picked_up',
                'details' => 'Package collected for delivery',
                'timestamp' => '2024-01-21 09:00:00',
            ],
            [
                'shipment_id' => $shipment2,
                'location' => 'Cebu Distribution',
                'status' => 'delivered',
                'details' => 'Successfully delivered to recipient',
                'timestamp' => '2024-01-21 17:00:00',
            ],
        ];

        foreach ($rows as $r) {
            DB::table('tracking_history')->updateOrInsert(
                [
                    'shipment_id' => $r['shipment_id'],
                    'location' => $r['location'],
                    'status' => $r['status'],
                    'timestamp' => $r['timestamp'],
                ],
                ['details' => $r['details']]
            );
        }
    }
}
