<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TransportSeeder extends Seeder
{
    public function run(): void
    {
        // Get all drivers
        $drivers = DB::table('users')->where('role', 'driver')->get();

        if ($drivers->isEmpty()) {
            echo "No drivers found. Please create driver users first.\n";
            return;
        }

        // Create budgets if not exist
        $budgetIds = [];
        for ($i = 1; $i <= 3; $i++) {
            $budgetId = DB::table('budgets')->insertGetId([
                'budget_name' => 'Transport Budget ' . $i,
                'start_date' => date('Y-m-d'),
                'end_date' => date('Y-m-d', strtotime('+1 year')),
                'total_budget' => 50000 + ($i * 10000),
            ]);
            $budgetIds[] = $budgetId;
        }

        // Create schedules if not exist
        $scheduleIds = [];
        for ($i = 1; $i <= 3; $i++) {
            $scheduleId = DB::table('schedules')->insertGetId([
                'schedule_name' => 'Route Schedule ' . $i,
                'start_time' => date('Y-m-d 08:00:00', strtotime("+$i days")),
                'end_time' => date('Y-m-d 17:00:00', strtotime("+$i days")),
                'route_details' => 'Standard delivery route',
            ]);
            $scheduleIds[] = $scheduleId;
        }

        // Create transport records for each driver
        $vehicles = [
            ['type' => 'Van', 'plate' => 'ABC-1234', 'capacity' => '1500 kg'],
            ['type' => 'Truck', 'plate' => 'XYZ-5678', 'capacity' => '5000 kg'],
            ['type' => 'Motorcycle', 'plate' => 'DEF-9012', 'capacity' => '50 kg'],
        ];

        $index = 0;
        foreach ($drivers as $driver) {
            $vehicle = $vehicles[$index % count($vehicles)];

            DB::table('transport')->insert([
                'vehicle_id' => 'VEH-' . str_pad($index + 1, 3, '0', STR_PAD_LEFT),
                'vehicle_type' => $vehicle['type'],
                'registration_number' => $vehicle['plate'],
                'capacity' => $vehicle['capacity'],
                'safety_compliance_details' => 'All safety checks passed',
                'driver_id' => $driver->user_id,
                'budget_id' => $budgetIds[$index % count($budgetIds)],
                'schedule_id' => $scheduleIds[$index % count($scheduleIds)],
            ]);

            echo "Created transport for driver: {$driver->username} - {$vehicle['type']} ({$vehicle['plate']})\n";
            $index++;
        }

        echo "Transport seeding completed!\n";
    }
}
