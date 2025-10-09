<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing data
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('gps_locations')->truncate();
        DB::table('invoices')->truncate();
        DB::table('shipments')->truncate();
        DB::table('orders')->truncate();
        DB::table('quotes')->truncate();
        DB::table('transport')->truncate();
        DB::table('warehouse')->truncate();
        DB::table('users')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 1. Create Users (1 admin, 2 warehouse managers, 2 booking managers, 2 drivers)
        $users = [
            // Admin
            [
                'user_id' => 1,
                'username' => 'admin',
                'email' => 'admin@logisync.com',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
            ],
            // Warehouse Managers
            [
                'user_id' => 2,
                'username' => 'carlos',
                'email' => 'carlos@logisync.com',
                'password' => Hash::make('warehouse123'),
                'role' => 'warehouse_manager',
            ],
            [
                'user_id' => 3,
                'username' => 'maria',
                'email' => 'maria@logisync.com',
                'password' => Hash::make('warehouse123'),
                'role' => 'warehouse_manager',
            ],
            // Booking Managers
            [
                'user_id' => 4,
                'username' => 'juan',
                'email' => 'juan@logisync.com',
                'password' => Hash::make('booking123'),
                'role' => 'booking_manager',
            ],
            [
                'user_id' => 5,
                'username' => 'ana',
                'email' => 'ana@logisync.com',
                'password' => Hash::make('booking123'),
                'role' => 'booking_manager',
            ],
            // Drivers
            [
                'user_id' => 6,
                'username' => 'pedro',
                'email' => 'pedro@logisync.com',
                'password' => Hash::make('driver123'),
                'role' => 'driver',
            ],
            [
                'user_id' => 7,
                'username' => 'jose',
                'email' => 'jose@logisync.com',
                'password' => Hash::make('driver123'),
                'role' => 'driver',
            ],
        ];

        foreach ($users as $user) {
            DB::table('users')->insert($user);
        }

        // 2. Create Warehouses
        $warehouses = [
            [
                'warehouse_id' => 1,
                'name' => 'Davao Main Warehouse',
                'location' => 'J.P. Laurel Ave, Davao City',
                'manager_id' => 2, // Carlos
                'capacity' => 5000,
                'current_stock' => 2500,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'warehouse_id' => 2,
                'name' => 'Tagum Distribution Center',
                'location' => 'National Highway, Tagum City',
                'manager_id' => 3, // Maria
                'capacity' => 3000,
                'current_stock' => 1200,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        foreach ($warehouses as $warehouse) {
            DB::table('warehouse')->insert($warehouse);
        }

        // 3. Create Transportation (Vehicles)
        $vehicles = [
            [
                'vehicle_id' => 1,
                'vehicle_type' => 'Truck',
                'plate_number' => 'ABC-1234',
                'driver_id' => 6, // Pedro
                'status' => 'available',
                'capacity' => 2000,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'vehicle_id' => 2,
                'vehicle_type' => 'Van',
                'plate_number' => 'XYZ-5678',
                'driver_id' => 7, // Jose
                'status' => 'in_transit',
                'capacity' => 1000,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        foreach ($vehicles as $vehicle) {
            DB::table('transport')->insert($vehicle);
        }

        // 4. Create Quotes
        $quotes = [
            [
                'quote_id' => 1,
                'customer_name' => 'ABC Corporation',
                'customer_email' => 'abc@company.com',
                'origin' => 'Davao City',
                'destination' => 'Manila',
                'cargo_details' => 'Electronics - 500kg',
                'estimated_cost' => 25000,
                'status' => 'pending',
                'created_by' => 4, // Juan
                'created_at' => Carbon::now()->subDays(5),
                'updated_at' => Carbon::now()->subDays(5),
            ],
            [
                'quote_id' => 2,
                'customer_name' => 'XYZ Trading',
                'customer_email' => 'xyz@trading.com',
                'origin' => 'Tagum City',
                'destination' => 'Cebu City',
                'cargo_details' => 'Food Products - 300kg',
                'estimated_cost' => 18000,
                'status' => 'approved',
                'created_by' => 5, // Ana
                'created_at' => Carbon::now()->subDays(3),
                'updated_at' => Carbon::now()->subDays(2),
            ],
        ];

        foreach ($quotes as $quote) {
            DB::table('quotes')->insert($quote);
        }

        // 5. Create Orders
        $orders = [
            [
                'order_id' => 1,
                'customer_name' => 'XYZ Trading',
                'customer_email' => 'xyz@trading.com',
                'origin' => 'Tagum City',
                'destination' => 'Cebu City',
                'cargo_details' => 'Food Products - 300kg',
                'total_cost' => 18000,
                'status' => 'confirmed',
                'quote_id' => 2,
                'created_by' => 5,
                'created_at' => Carbon::now()->subDays(2),
                'updated_at' => Carbon::now()->subDays(2),
            ],
            [
                'order_id' => 2,
                'customer_name' => 'Tech Solutions Inc',
                'customer_email' => 'tech@solutions.com',
                'origin' => 'Davao City',
                'destination' => 'Cagayan de Oro',
                'cargo_details' => 'Computer Equipment - 450kg',
                'total_cost' => 22000,
                'status' => 'confirmed',
                'created_by' => 4,
                'created_at' => Carbon::now()->subDays(1),
                'updated_at' => Carbon::now()->subDays(1),
            ],
        ];

        foreach ($orders as $order) {
            DB::table('orders')->insert($order);
        }

        // 6. Create Shipments
        $shipments = [
            [
                'shipment_id' => 1,
                'order_id' => 1,
                'vehicle_id' => 2, // Van - Jose
                'warehouse_id' => 2, // Tagum
                'driver_id' => 7, // Jose
                'origin' => 'Tagum City',
                'destination' => 'Cebu City',
                'status' => 'in_transit',
                'estimated_delivery' => Carbon::now()->addDays(2),
                'actual_delivery' => null,
                'created_at' => Carbon::now()->subHours(12),
                'updated_at' => Carbon::now()->subHours(1),
            ],
            [
                'shipment_id' => 2,
                'order_id' => 2,
                'vehicle_id' => 1, // Truck - Pedro
                'warehouse_id' => 1, // Davao
                'driver_id' => 6, // Pedro
                'origin' => 'Davao City',
                'destination' => 'Cagayan de Oro',
                'status' => 'preparing',
                'estimated_delivery' => Carbon::now()->addDays(3),
                'actual_delivery' => null,
                'created_at' => Carbon::now()->subHours(6),
                'updated_at' => Carbon::now()->subHours(6),
            ],
        ];

        foreach ($shipments as $shipment) {
            DB::table('shipments')->insert($shipment);
        }

        // 7. Create GPS Locations for in-transit shipment
        $gpsLocations = [
            [
                'shipment_id' => 1,
                'latitude' => 7.0644,
                'longitude' => 125.6078,
                'timestamp' => Carbon::now()->subHours(11),
                'created_at' => Carbon::now()->subHours(11),
                'updated_at' => Carbon::now()->subHours(11),
            ],
            [
                'shipment_id' => 1,
                'latitude' => 7.3697,
                'longitude' => 125.4056,
                'timestamp' => Carbon::now()->subHours(9),
                'created_at' => Carbon::now()->subHours(9),
                'updated_at' => Carbon::now()->subHours(9),
            ],
            [
                'shipment_id' => 1,
                'latitude' => 7.8893,
                'longitude' => 124.8939,
                'timestamp' => Carbon::now()->subHours(6),
                'created_at' => Carbon::now()->subHours(6),
                'updated_at' => Carbon::now()->subHours(6),
            ],
            [
                'shipment_id' => 1,
                'latitude' => 8.4829,
                'longitude' => 124.6513,
                'timestamp' => Carbon::now()->subHours(3),
                'created_at' => Carbon::now()->subHours(3),
                'updated_at' => Carbon::now()->subHours(3),
            ],
            [
                'shipment_id' => 1,
                'latitude' => 9.3067,
                'longitude' => 123.8907,
                'timestamp' => Carbon::now()->subHours(1),
                'created_at' => Carbon::now()->subHours(1),
                'updated_at' => Carbon::now()->subHours(1),
            ],
        ];

        foreach ($gpsLocations as $location) {
            DB::table('gps_locations')->insert($location);
        }

        // 8. Create Invoice for completed order
        $invoice = [
            'invoice_id' => 1,
            'order_id' => 1,
            'shipment_id' => 1,
            'invoice_number' => 'INV-' . date('Y') . '-0001',
            'amount' => 18000,
            'tax' => 2160, // 12% VAT
            'total_amount' => 20160,
            'status' => 'unpaid',
            'due_date' => Carbon::now()->addDays(30),
            'generated_at' => Carbon::now()->subHours(12),
            'created_at' => Carbon::now()->subHours(12),
            'updated_at' => Carbon::now()->subHours(12),
        ];

        DB::table('invoices')->insert($invoice);

        // 9. Create Subscription Plans
        $subscriptionPlans = [
            [
                'subscription_id' => 1,
                'plan_name' => 'Free',
                'slug' => 'free',
                'description' => 'Perfect for getting started with basic logistics management',
                'price' => 0,
                'term_months' => 1,
                'active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'subscription_id' => 2,
                'plan_name' => 'Pro',
                'slug' => 'pro',
                'description' => 'Advanced features for growing logistics businesses',
                'price' => 499,
                'term_months' => 1,
                'active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'subscription_id' => 3,
                'plan_name' => 'Enterprise',
                'slug' => 'enterprise',
                'description' => 'Full-featured solution with priority support',
                'price' => 999,
                'term_months' => 1,
                'active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        foreach ($subscriptionPlans as $plan) {
            DB::table('subscriptions')->insert($plan);
        }

        echo "\n✅ Demo data seeded successfully!\n\n";
        echo "📋 Test Accounts (Username / Password):\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "👤 Admin:\n";
        echo "   Username: admin / admin123\n";
        echo "   Email: admin@logisync.com\n\n";
        echo "🏭 Warehouse Managers:\n";
        echo "   1. carlos / warehouse123 (carlos@logisync.com)\n";
        echo "   2. maria / warehouse123 (maria@logisync.com)\n\n";
        echo "📦 Booking Managers:\n";
        echo "   1. juan / booking123 (juan@logisync.com)\n";
        echo "   2. ana / booking123 (ana@logisync.com)\n\n";
        echo "🚚 Drivers:\n";
        echo "   1. pedro / driver123 (pedro@logisync.com)\n";
        echo "   2. jose / driver123 (jose@logisync.com)\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        echo "📊 Sample Data Created:\n";
        echo "   • 2 Warehouses (Davao Main, Tagum)\n";
        echo "   • 2 Vehicles (1 Truck, 1 Van)\n";
        echo "   • 2 Quotes (1 pending, 1 approved)\n";
        echo "   • 2 Orders (confirmed)\n";
        echo "   • 2 Shipments (1 in-transit with GPS, 1 preparing)\n";
        echo "   • 1 Invoice (unpaid)\n";
        echo "   • 3 Subscription Plans (Free, Pro, Enterprise)\n\n";
    }
}
