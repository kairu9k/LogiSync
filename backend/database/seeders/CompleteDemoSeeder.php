<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CompleteDemoSeeder extends Seeder
{
    public function run(): void
    {
        echo "\n🚀 Seeding sample data...\n\n";

        // 1. Budgets (required for transport)
        try {
            DB::table('budgets')->insert([
                [
                    'budget_id' => 1,
                    'budget_name' => 'Q1 2025 Transportation Budget',
                    'start_date' => Carbon::now()->startOfQuarter(),
                    'end_date' => Carbon::now()->endOfQuarter(),
                    'total_budget' => 500000
                ],
                [
                    'budget_id' => 2,
                    'budget_name' => 'Fleet Maintenance Budget',
                    'start_date' => Carbon::now()->startOfMonth(),
                    'end_date' => Carbon::now()->endOfMonth(),
                    'total_budget' => 150000
                ],
            ]);
            echo "✅ Budgets created\n";
        } catch (\Exception $e) {
            echo "⚠️  Budgets: " . $e->getMessage() . "\n";
        }

        // 2. Schedules (required for transport)
        try {
            DB::table('schedules')->insert([
                [
                    'schedule_id' => 1,
                    'schedule_name' => 'Davao-Cebu Route',
                    'start_time' => Carbon::now()->addHours(2),
                    'end_time' => Carbon::now()->addHours(14),
                    'route_details' => 'Main highway route via Surigao'
                ],
                [
                    'schedule_id' => 2,
                    'schedule_name' => 'Davao-CDO Route',
                    'start_time' => Carbon::now()->addHours(3),
                    'end_time' => Carbon::now()->addHours(9),
                    'route_details' => 'Direct coastal highway'
                ],
                [
                    'schedule_id' => 3,
                    'schedule_name' => 'Davao-GenSan Route',
                    'start_time' => Carbon::now()->addHours(1),
                    'end_time' => Carbon::now()->addHours(4),
                    'route_details' => 'National Highway'
                ],
            ]);
            echo "✅ Schedules created\n";
        } catch (\Exception $e) {
            echo "⚠️  Schedules: " . $e->getMessage() . "\n";
        }

        // 3. Transportation/Vehicles
        try {
            DB::table('transport')->insert([
                [
                    'transport_id' => 1,
                    'vehicle_id' => 'V001',
                    'vehicle_type' => 'Truck',
                    'registration_number' => 'ABC-1234',
                    'capacity' => '2000kg',
                    'driver_id' => 6, // Pedro
                    'budget_id' => 1,
                    'schedule_id' => 1
                ],
                [
                    'transport_id' => 2,
                    'vehicle_id' => 'V002',
                    'vehicle_type' => 'Van',
                    'registration_number' => 'XYZ-5678',
                    'capacity' => '1000kg',
                    'driver_id' => 7, // Jose
                    'budget_id' => 1,
                    'schedule_id' => 2
                ],
                [
                    'transport_id' => 3,
                    'vehicle_id' => 'V003',
                    'vehicle_type' => 'Truck',
                    'registration_number' => 'DEF-9012',
                    'capacity' => '2500kg',
                    'driver_id' => 6, // Pedro
                    'budget_id' => 2,
                    'schedule_id' => 3
                ],
            ]);
            echo "✅ Vehicles created\n";
        } catch (\Exception $e) {
            echo "⚠️  Vehicles: " . $e->getMessage() . "\n";
        }

        // 4. Quotes
        try {
            DB::table('quotes')->insert([
                [
                    'quote_id' => 1,
                    'creation_date' => Carbon::now()->subDays(5),
                    'user_id' => 4, // Juan (booking manager)
                    'customer_name' => 'ABC Corporation',
                    'created_by_user_id' => 4,
                    'weight' => 500,
                    'dimensions' => '120x80x100cm',
                    'estimated_cost' => 25000,
                    'expiry_date' => Carbon::now()->addDays(25),
                    'status' => 'pending',
                    'distance' => 950
                ],
                [
                    'quote_id' => 2,
                    'creation_date' => Carbon::now()->subDays(3),
                    'user_id' => 5, // Ana (booking manager)
                    'customer_name' => 'XYZ Trading',
                    'created_by_user_id' => 5,
                    'weight' => 300,
                    'dimensions' => '100x60x80cm',
                    'estimated_cost' => 18000,
                    'expiry_date' => Carbon::now()->addDays(27),
                    'status' => 'approved',
                    'distance' => 680
                ],
                [
                    'quote_id' => 3,
                    'creation_date' => Carbon::now()->subDays(2),
                    'user_id' => 4, // Juan (booking manager)
                    'customer_name' => 'Tech Solutions Inc',
                    'created_by_user_id' => 4,
                    'weight' => 450,
                    'dimensions' => '110x70x90cm',
                    'estimated_cost' => 22000,
                    'expiry_date' => Carbon::now()->addDays(28),
                    'status' => 'approved',
                    'distance' => 780
                ],
            ]);
            echo "✅ Quotes created\n";
        } catch (\Exception $e) {
            echo "⚠️  Quotes: " . $e->getMessage() . "\n";
        }

        // 5. Orders
        try {
            DB::table('orders')->insert([
                [
                    'order_id' => 1,
                    'order_date' => Carbon::now()->subDays(2),
                    'user_id' => 5, // Ana
                    'order_status' => 'confirmed',
                    'quote_id' => 2
                ],
                [
                    'order_id' => 2,
                    'order_date' => Carbon::now()->subDays(1),
                    'user_id' => 4, // Juan
                    'order_status' => 'confirmed',
                    'quote_id' => 3
                ],
                [
                    'order_id' => 3,
                    'order_date' => Carbon::now()->subHours(18),
                    'user_id' => 5, // Ana
                    'order_status' => 'confirmed',
                    'quote_id' => null
                ],
            ]);
            echo "✅ Orders created\n";
        } catch (\Exception $e) {
            echo "⚠️  Orders: " . $e->getMessage() . "\n";
        }

        // 6. Shipments
        try {
            DB::table('shipments')->insert([
                [
                    'shipment_id' => 1,
                    'tracking_number' => 'LS-2025-001',
                    'receiver_name' => 'John Doe',
                    'receiver_address' => 'Banilad, Cebu City, 6000 Cebu',
                    'origin_name' => 'XYZ Trading Warehouse',
                    'origin_address' => 'National Highway, Tagum City, 8100 Davao del Norte',
                    'destination_name' => 'ABC Store Cebu',
                    'destination_address' => 'Banilad, Cebu City, 6000 Cebu',
                    'creation_date' => Carbon::now()->subHours(12),
                    'charges' => 18000,
                    'status' => 'in_transit',
                    'departure_date' => Carbon::now()->subHours(11),
                    'order_id' => 1,
                    'transport_id' => 2
                ],
                [
                    'shipment_id' => 2,
                    'tracking_number' => 'LS-2025-002',
                    'receiver_name' => 'Maria Santos',
                    'receiver_address' => 'Kauswagan, Cagayan de Oro City, 9000',
                    'origin_name' => 'Davao Main Warehouse',
                    'origin_address' => 'J.P. Laurel Ave, Bajada, Davao City, 8000',
                    'destination_name' => 'Tech Solutions CDO',
                    'destination_address' => 'Kauswagan, Cagayan de Oro City, 9000',
                    'creation_date' => Carbon::now()->subHours(6),
                    'charges' => 22000,
                    'status' => 'preparing',
                    'departure_date' => Carbon::now()->addHours(2),
                    'order_id' => 2,
                    'transport_id' => 1
                ],
                [
                    'shipment_id' => 3,
                    'tracking_number' => 'LS-2025-003',
                    'receiver_name' => 'Pedro Cruz',
                    'receiver_address' => 'Bulaong, General Santos City, 9500',
                    'origin_name' => 'Davao Main Warehouse',
                    'origin_address' => 'J.P. Laurel Ave, Bajada, Davao City, 8000',
                    'destination_name' => 'Fresh Harvest GenSan',
                    'destination_address' => 'Bulaong, General Santos City, 9500',
                    'creation_date' => Carbon::now()->subHours(18),
                    'charges' => 15000,
                    'status' => 'pending',
                    'departure_date' => null,
                    'order_id' => 3,
                    'transport_id' => 3
                ],
            ]);
            echo "✅ Shipments created\n";
        } catch (\Exception $e) {
            echo "⚠️  Shipments: " . $e->getMessage() . "\n";
        }

        // 7. GPS Locations (for in-transit shipment)
        try {
            DB::table('gps_locations')->insert([
                [
                    'shipment_id' => 1,
                    'driver_id' => 7, // Jose
                    'latitude' => 7.0644,
                    'longitude' => 125.6078,
                    'speed' => 60.5,
                    'accuracy' => 10.0,
                    'recorded_at' => Carbon::now()->subHours(11),
                    'created_at' => Carbon::now()->subHours(11),
                    'updated_at' => Carbon::now()->subHours(11)
                ],
                [
                    'shipment_id' => 1,
                    'driver_id' => 7,
                    'latitude' => 7.3697,
                    'longitude' => 125.4056,
                    'speed' => 65.0,
                    'accuracy' => 8.0,
                    'recorded_at' => Carbon::now()->subHours(9),
                    'created_at' => Carbon::now()->subHours(9),
                    'updated_at' => Carbon::now()->subHours(9)
                ],
                [
                    'shipment_id' => 1,
                    'driver_id' => 7,
                    'latitude' => 7.8893,
                    'longitude' => 124.8939,
                    'speed' => 70.0,
                    'accuracy' => 12.0,
                    'recorded_at' => Carbon::now()->subHours(6),
                    'created_at' => Carbon::now()->subHours(6),
                    'updated_at' => Carbon::now()->subHours(6)
                ],
                [
                    'shipment_id' => 1,
                    'driver_id' => 7,
                    'latitude' => 8.4829,
                    'longitude' => 124.6513,
                    'speed' => 68.5,
                    'accuracy' => 9.0,
                    'recorded_at' => Carbon::now()->subHours(3),
                    'created_at' => Carbon::now()->subHours(3),
                    'updated_at' => Carbon::now()->subHours(3)
                ],
                [
                    'shipment_id' => 1,
                    'driver_id' => 7,
                    'latitude' => 9.3067,
                    'longitude' => 123.8907,
                    'speed' => 55.0,
                    'accuracy' => 7.0,
                    'recorded_at' => Carbon::now()->subHours(1),
                    'created_at' => Carbon::now()->subHours(1),
                    'updated_at' => Carbon::now()->subHours(1)
                ],
            ]);
            echo "✅ GPS locations created\n";
        } catch (\Exception $e) {
            echo "⚠️  GPS locations: " . $e->getMessage() . "\n";
        }

        // 8. Invoices
        try {
            DB::table('invoices')->insert([
                [
                    'invoice_id' => 1,
                    'order_id' => 1,
                    'invoice_type' => 'Delivery Invoice',
                    'invoice_date' => Carbon::now()->subHours(12),
                    'due_date' => Carbon::now()->addDays(30),
                    'amount' => 18000,
                    'status' => 'unpaid'
                ],
                [
                    'invoice_id' => 2,
                    'order_id' => 2,
                    'invoice_type' => 'Delivery Invoice',
                    'invoice_date' => Carbon::now()->subHours(6),
                    'due_date' => Carbon::now()->addDays(30),
                    'amount' => 22000,
                    'status' => 'unpaid'
                ],
            ]);
            echo "✅ Invoices created\n";
        } catch (\Exception $e) {
            echo "⚠️  Invoices: " . $e->getMessage() . "\n";
        }

        echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "📊 Database Summary:\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "• Users: " . DB::table('users')->count() . "\n";
        echo "• Warehouses: " . DB::table('warehouse')->count() . "\n";
        echo "• Budgets: " . DB::table('budgets')->count() . "\n";
        echo "• Schedules: " . DB::table('schedules')->count() . "\n";
        echo "• Vehicles: " . DB::table('transport')->count() . "\n";
        echo "• Quotes: " . DB::table('quotes')->count() . "\n";
        echo "• Orders: " . DB::table('orders')->count() . "\n";
        echo "• Shipments: " . DB::table('shipments')->count() . "\n";
        echo "• GPS Locations: " . DB::table('gps_locations')->count() . "\n";
        echo "• Invoices: " . DB::table('invoices')->count() . "\n";
        echo "• Subscription Plans: " . DB::table('subscriptions')->count() . "\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    }
}
