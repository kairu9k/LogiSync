<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TransportTableSeeder extends Seeder
{
    public function run(): void
    {
        // Resolve FKs by unique business keys
        $driverId = DB::table('users')->where('username', 'driver01')->value('user_id');

        $budgetQ1 = DB::table('budgets')->where('budget_name', 'Q1 2024 Transport Budget')->value('budget_id');
        $budgetAnnual = DB::table('budgets')->where('budget_name', 'Annual Fleet Budget')->value('budget_id');

        $schedMorning = DB::table('schedules')->where('schedule_name', 'Morning Delivery Route')->value('schedule_id');
        $schedAfternoon = DB::table('schedules')->where('schedule_name', 'Afternoon Pickup Route')->value('schedule_id');

        // Seed transports by unique registration_number
        DB::table('transport')->updateOrInsert(
            ['registration_number' => 'ABC-1234'],
            [
                'vehicle_id' => 'V001',
                'vehicle_type' => 'Truck',
                'capacity' => '5000kg',
                'safety_compliance_details' => 'All safety inspections current',
                'budget_id' => $budgetQ1,
                'schedule_id' => $schedMorning,
                'driver_id' => $driverId,
            ]
        );

        DB::table('transport')->updateOrInsert(
            ['registration_number' => 'XYZ-5678'],
            [
                'vehicle_id' => 'V002',
                'vehicle_type' => 'Van',
                'capacity' => '2000kg',
                'safety_compliance_details' => 'DOT certified, insurance valid',
                'budget_id' => $budgetAnnual,
                'schedule_id' => $schedAfternoon,
                'driver_id' => $driverId,
            ]
        );
    }
}
