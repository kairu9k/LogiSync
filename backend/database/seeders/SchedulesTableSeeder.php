<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SchedulesTableSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            [
                'schedule_name' => 'Morning Delivery Route',
                'start_time' => '2024-01-16 08:00:00',
                'end_time' => '2024-01-16 12:00:00',
                'route_details' => 'Davao to Manila via SLEX',
            ],
            [
                'schedule_name' => 'Afternoon Pickup Route',
                'start_time' => '2024-01-16 13:00:00',
                'end_time' => '2024-01-16 17:00:00',
                'route_details' => 'Manila to Cebu via ferry',
            ],
            [
                'schedule_name' => 'Express Overnight',
                'start_time' => '2024-01-16 20:00:00',
                'end_time' => '2024-01-17 06:00:00',
                'route_details' => 'Direct route Manila to Davao',
            ],
        ];

        foreach ($rows as $r) {
            DB::table('schedules')->updateOrInsert(
                [
                    'schedule_name' => $r['schedule_name'],
                    'start_time' => $r['start_time'],
                ],
                [
                    'end_time' => $r['end_time'],
                    'route_details' => $r['route_details'],
                ]
            );
        }
    }
}
