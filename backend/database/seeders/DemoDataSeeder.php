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
        DB::table('tracking_history')->truncate();
        DB::table('invoices')->truncate();
        DB::table('shipments')->truncate();
        DB::table('inventory')->truncate();
        DB::table('order_details')->truncate();
        DB::table('orders')->truncate();
        DB::table('quotes')->truncate();
        DB::table('transport')->truncate();
        DB::table('budgets')->truncate();
        DB::table('schedules')->truncate();
        DB::table('warehouse')->truncate();
        DB::table('pricing_config')->truncate();
        DB::table('subscriptions')->truncate();
        DB::table('users')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 1. Create Pricing Configuration
        DB::table('pricing_config')->insert([
            'base_rate' => 100.00,
            'per_km_rate' => 15.00,
            'per_kg_rate' => 5.00,
            'fuel_surcharge_percent' => 10.00,
            'insurance_percent' => 2.00,
            'minimum_charge' => 200.00,
            'priority_multiplier' => 1.00, // Standard
            'express_multiplier' => 1.50, // Remote areas
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        // 2. Create Users (1 admin, 2 warehouse managers, 2 booking managers, 3 drivers)
        $users = [
            // Admin
            [
                'username' => 'Admin User',
                'email' => 'admin@logisync.com',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'email_verified' => true,
                'email_verification_code' => null,
                'email_verification_code_expires_at' => null,
            ],
            // Warehouse Managers
            [
                'username' => 'Carlos Santos',
                'email' => 'carlos@logisync.com',
                'password' => Hash::make('warehouse123'),
                'role' => 'warehouse_manager',
                'email_verified' => true,
                'email_verification_code' => null,
                'email_verification_code_expires_at' => null,
            ],
            [
                'username' => 'Maria Cruz',
                'email' => 'maria@logisync.com',
                'password' => Hash::make('warehouse123'),
                'role' => 'warehouse_manager',
                'email_verified' => true,
                'email_verification_code' => null,
                'email_verification_code_expires_at' => null,
            ],
            // Booking Managers
            [
                'username' => 'Juan Reyes',
                'email' => 'juan@logisync.com',
                'password' => Hash::make('booking123'),
                'role' => 'booking_manager',
                'email_verified' => true,
                'email_verification_code' => null,
                'email_verification_code_expires_at' => null,
            ],
            [
                'username' => 'Ana Lopez',
                'email' => 'ana@logisync.com',
                'password' => Hash::make('booking123'),
                'role' => 'booking_manager',
                'email_verified' => true,
                'email_verification_code' => null,
                'email_verification_code_expires_at' => null,
            ],
            // Drivers
            [
                'username' => 'Pedro Garcia',
                'email' => 'pedro@logisync.com',
                'password' => Hash::make('driver123'),
                'role' => 'driver',
                'email_verified' => true,
                'email_verification_code' => null,
                'email_verification_code_expires_at' => null,
            ],
            [
                'username' => 'Jose Ramos',
                'email' => 'jose@logisync.com',
                'password' => Hash::make('driver123'),
                'role' => 'driver',
                'email_verified' => true,
                'email_verification_code' => null,
                'email_verification_code_expires_at' => null,
            ],
            [
                'username' => 'Miguel Torres',
                'email' => 'miguel@logisync.com',
                'password' => Hash::make('driver123'),
                'role' => 'driver',
                'email_verified' => true,
                'email_verification_code' => null,
                'email_verification_code_expires_at' => null,
            ],
        ];

        foreach ($users as $user) {
            DB::table('users')->insert($user);
        }

        // Get user IDs
        $adminId = DB::table('users')->where('email', 'admin@logisync.com')->value('user_id');
        $carlosId = DB::table('users')->where('email', 'carlos@logisync.com')->value('user_id');
        $mariaId = DB::table('users')->where('email', 'maria@logisync.com')->value('user_id');
        $juanId = DB::table('users')->where('email', 'juan@logisync.com')->value('user_id');
        $anaId = DB::table('users')->where('email', 'ana@logisync.com')->value('user_id');
        $pedroId = DB::table('users')->where('email', 'pedro@logisync.com')->value('user_id');
        $joseId = DB::table('users')->where('email', 'jose@logisync.com')->value('user_id');
        $miguelId = DB::table('users')->where('email', 'miguel@logisync.com')->value('user_id');

        // 3. Create Subscription Plans
        $subscriptions = [
            [
                'plan_name' => 'Starter',
                'description' => 'Perfect for getting started - Includes 5 drivers, GPS tracking, basic reports, and email support',
                'price' => 149900, // ₱1,499.00 in centavos
                'term_months' => 1,
            ],
            [
                'plan_name' => 'Professional',
                'description' => 'Advanced features for growing businesses - Includes 20 drivers, GPS tracking, custom pricing, advanced reports, and priority support',
                'price' => 399900, // ₱3,999.00 in centavos
                'term_months' => 1,
            ],
            [
                'plan_name' => 'Enterprise',
                'description' => 'Full-featured solution - Unlimited drivers, GPS tracking, custom pricing, advanced reports, dedicated support, and custom integrations',
                'price' => 999900, // ₱9,999.00 in centavos (custom pricing)
                'term_months' => 12,
            ],
        ];

        foreach ($subscriptions as $subscription) {
            DB::table('subscriptions')->insert($subscription);
        }

        // 4. Create Warehouses
        $warehouses = [
            [
                'name' => 'Davao Main Warehouse',
                'location' => 'J.P. Laurel Ave, Davao City, Philippines',
                'capacity' => 5000,
                'manager_id' => $carlosId,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Tagum Distribution Center',
                'location' => 'National Highway, Tagum City, Davao del Norte',
                'capacity' => 3000,
                'manager_id' => $mariaId,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        foreach ($warehouses as $warehouse) {
            DB::table('warehouse')->insert($warehouse);
        }

        // Get warehouse IDs
        $davaoWarehouseId = DB::table('warehouse')->where('name', 'Davao Main Warehouse')->value('warehouse_id');
        $tagumWarehouseId = DB::table('warehouse')->where('name', 'Tagum Distribution Center')->value('warehouse_id');

        // 5. Create Budgets
        $budgets = [
            [
                'budget_name' => 'Fuel Budget Q1 2025',
                'allocated_amount' => 50000.00,
                'spent_amount' => 15000.00,
                'start_date' => Carbon::now()->subDays(30),
                'end_date' => Carbon::now()->addDays(60),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'budget_name' => 'Maintenance Budget 2025',
                'allocated_amount' => 100000.00,
                'spent_amount' => 25000.00,
                'start_date' => Carbon::now()->startOfYear(),
                'end_date' => Carbon::now()->endOfYear(),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        foreach ($budgets as $budget) {
            DB::table('budgets')->insert($budget);
        }

        // Get budget IDs
        $fuelBudgetId = DB::table('budgets')->where('budget_name', 'Fuel Budget Q1 2025')->value('budget_id');

        // 6. Create Schedules
        $schedules = [
            [
                'route_name' => 'Davao to Cebu Route',
                'departure_time' => '08:00:00',
                'arrival_time' => '16:00:00',
                'frequency' => 'daily',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'route_name' => 'Tagum to Cagayan de Oro',
                'departure_time' => '06:00:00',
                'arrival_time' => '14:00:00',
                'frequency' => 'weekly',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        foreach ($schedules as $schedule) {
            DB::table('schedules')->insert($schedule);
        }

        // Get schedule IDs
        $davaoToCebuScheduleId = DB::table('schedules')->where('route_name', 'Davao to Cebu Route')->value('schedule_id');

        // 7. Create Transportation (Vehicles)
        $vehicles = [
            [
                'vehicle_type' => 'Truck',
                'license_plate' => 'ABC-1234',
                'driver_id' => $pedroId,
                'capacity_kg' => 2000,
                'status' => 'available',
                'budget_id' => $fuelBudgetId,
                'schedule_id' => $davaoToCebuScheduleId,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'vehicle_type' => 'Van',
                'license_plate' => 'XYZ-5678',
                'driver_id' => $joseId,
                'capacity_kg' => 1000,
                'status' => 'in_transit',
                'budget_id' => $fuelBudgetId,
                'schedule_id' => $davaoToCebuScheduleId,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'vehicle_type' => 'Motorcycle',
                'license_plate' => 'MNO-9012',
                'driver_id' => $miguelId,
                'capacity_kg' => 200,
                'status' => 'available',
                'budget_id' => $fuelBudgetId,
                'schedule_id' => null,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        foreach ($vehicles as $vehicle) {
            DB::table('transport')->insert($vehicle);
        }

        // Get transport IDs
        $truckId = DB::table('transport')->where('license_plate', 'ABC-1234')->value('transport_id');
        $vanId = DB::table('transport')->where('license_plate', 'XYZ-5678')->value('transport_id');

        // 8. Create Quotes
        $quotes = [
            [
                'customer_name' => 'ABC Corporation',
                'customer_email' => 'contact@abccorp.com',
                'origin' => 'Davao City',
                'destination' => 'Manila',
                'weight_kg' => 500,
                'dimensions_cm' => '100x80x60',
                'distance_km' => 1500,
                'cost_cents' => 2500000, // ₱25,000.00
                'service_type' => 'standard',
                'status' => 'pending',
                'created_by' => $juanId,
                'created_at' => Carbon::now()->subDays(5),
                'updated_at' => Carbon::now()->subDays(5),
            ],
            [
                'customer_name' => 'XYZ Trading',
                'customer_email' => 'orders@xyztrading.com',
                'origin' => 'Tagum City',
                'destination' => 'Cebu City',
                'weight_kg' => 300,
                'dimensions_cm' => '80x60x50',
                'distance_km' => 400,
                'cost_cents' => 1800000, // ₱18,000.00
                'service_type' => 'standard',
                'status' => 'approved',
                'created_by' => $anaId,
                'created_at' => Carbon::now()->subDays(3),
                'updated_at' => Carbon::now()->subDays(2),
            ],
            [
                'customer_name' => 'Tech Solutions Inc',
                'customer_email' => 'logistics@techsolutions.com',
                'origin' => 'Davao City',
                'destination' => 'Cagayan de Oro',
                'weight_kg' => 450,
                'dimensions_cm' => '90x70x55',
                'distance_km' => 300,
                'cost_cents' => 2200000, // ₱22,000.00
                'service_type' => 'standard',
                'status' => 'approved',
                'created_by' => $juanId,
                'created_at' => Carbon::now()->subDays(1),
                'updated_at' => Carbon::now()->subHours(12),
            ],
        ];

        foreach ($quotes as $quote) {
            DB::table('quotes')->insert($quote);
        }

        // Get quote IDs
        $quote1Id = DB::table('quotes')->where('customer_email', 'orders@xyztrading.com')->value('quote_id');
        $quote2Id = DB::table('quotes')->where('customer_email', 'logistics@techsolutions.com')->value('quote_id');

        // 9. Create Orders
        $orders = [
            [
                'customer_name' => 'XYZ Trading',
                'customer_email' => 'orders@xyztrading.com',
                'order_status' => 'confirmed',
                'total_cost' => 18000.00,
                'quote_id' => $quote1Id,
                'created_by' => $anaId,
                'created_at' => Carbon::now()->subDays(2),
                'updated_at' => Carbon::now()->subDays(2),
            ],
            [
                'customer_name' => 'Tech Solutions Inc',
                'customer_email' => 'logistics@techsolutions.com',
                'order_status' => 'confirmed',
                'total_cost' => 22000.00,
                'quote_id' => $quote2Id,
                'created_by' => $juanId,
                'created_at' => Carbon::now()->subHours(12),
                'updated_at' => Carbon::now()->subHours(12),
            ],
        ];

        foreach ($orders as $order) {
            DB::table('orders')->insert($order);
        }

        // Get order IDs
        $order1Id = DB::table('orders')->where('customer_email', 'orders@xyztrading.com')->value('order_id');
        $order2Id = DB::table('orders')->where('customer_email', 'logistics@techsolutions.com')->value('order_id');

        // 10. Create Shipments
        $shipments = [
            [
                'tracking_number' => 'LS-' . strtoupper(substr(md5(time()), 0, 10)),
                'receiver_name' => 'Juan Dela Cruz',
                'receiver_address' => '123 Osmeña Blvd, Cebu City, Philippines',
                'receiver_contact' => '+639171234567',
                'origin_name' => 'XYZ Trading',
                'origin_address' => 'National Highway, Tagum City, Davao del Norte',
                'destination_name' => 'Cebu Warehouse',
                'destination_address' => '123 Osmeña Blvd, Cebu City, Philippines',
                'creation_date' => Carbon::now()->subHours(12),
                'charges' => 1800000, // ₱18,000.00 in centavos
                'status' => 'in_transit',
                'departure_date' => Carbon::now()->subHours(10),
                'order_id' => $order1Id,
                'transport_id' => $vanId,
            ],
            [
                'tracking_number' => 'LS-' . strtoupper(substr(md5(time() + 1), 0, 10)),
                'receiver_name' => 'Maria Santos',
                'receiver_address' => '456 Tiano Brothers St, Cagayan de Oro City',
                'receiver_contact' => '+639181234567',
                'origin_name' => 'Tech Solutions Inc',
                'origin_address' => 'J.P. Laurel Ave, Davao City, Philippines',
                'destination_name' => 'CDO Distribution Hub',
                'destination_address' => '456 Tiano Brothers St, Cagayan de Oro City',
                'creation_date' => Carbon::now()->subHours(6),
                'charges' => 2200000, // ₱22,000.00 in centavos
                'status' => 'pending',
                'departure_date' => Carbon::now()->addHours(6),
                'order_id' => $order2Id,
                'transport_id' => $truckId,
            ],
        ];

        foreach ($shipments as $shipment) {
            DB::table('shipments')->insert($shipment);
        }

        // Get shipment IDs
        $shipment1Id = DB::table('shipments')->where('order_id', $order1Id)->value('shipment_id');

        // 11. Create GPS Locations for in-transit shipment (Tagum to Cebu route simulation)
        $gpsLocations = [
            // Starting point: Tagum City
            [
                'shipment_id' => $shipment1Id,
                'latitude' => 7.4474, // Tagum City
                'longitude' => 125.8078,
                'speed' => 0,
                'accuracy' => 10,
                'timestamp' => Carbon::now()->subHours(10),
                'created_at' => Carbon::now()->subHours(10),
                'updated_at' => Carbon::now()->subHours(10),
            ],
            // En route to Butuan
            [
                'shipment_id' => $shipment1Id,
                'latitude' => 8.5000,
                'longitude' => 125.3000,
                'speed' => 60,
                'accuracy' => 15,
                'timestamp' => Carbon::now()->subHours(8),
                'created_at' => Carbon::now()->subHours(8),
                'updated_at' => Carbon::now()->subHours(8),
            ],
            // Butuan City area
            [
                'shipment_id' => $shipment1Id,
                'latitude' => 8.9494,
                'longitude' => 125.5406,
                'speed' => 50,
                'accuracy' => 12,
                'timestamp' => Carbon::now()->subHours(6),
                'created_at' => Carbon::now()->subHours(6),
                'updated_at' => Carbon::now()->subHours(6),
            ],
            // En route to Surigao
            [
                'shipment_id' => $shipment1Id,
                'latitude' => 9.7862,
                'longitude' => 125.4941,
                'speed' => 55,
                'accuracy' => 20,
                'timestamp' => Carbon::now()->subHours(4),
                'created_at' => Carbon::now()->subHours(4),
                'updated_at' => Carbon::now()->subHours(4),
            ],
            // Current location: Near Cebu (via ferry)
            [
                'shipment_id' => $shipment1Id,
                'latitude' => 10.3157,
                'longitude' => 123.8854, // Cebu City
                'speed' => 0,
                'accuracy' => 8,
                'timestamp' => Carbon::now()->subMinutes(30),
                'created_at' => Carbon::now()->subMinutes(30),
                'updated_at' => Carbon::now()->subMinutes(30),
            ],
        ];

        foreach ($gpsLocations as $location) {
            DB::table('gps_locations')->insert($location);
        }

        // 12. Create Inventory items
        $inventoryItems = [
            [
                'order_id' => $order1Id,
                'warehouse_id' => $tagumWarehouseId,
                'item_name' => 'Food Products Package',
                'quantity' => 300,
                'location' => 'Shelf A-12',
                'status' => 'shipped',
                'created_at' => Carbon::now()->subDays(2),
                'updated_at' => Carbon::now()->subHours(12),
            ],
            [
                'order_id' => $order2Id,
                'warehouse_id' => $davaoWarehouseId,
                'item_name' => 'Computer Equipment',
                'quantity' => 450,
                'location' => 'Shelf B-05',
                'status' => 'in_stock',
                'created_at' => Carbon::now()->subHours(12),
                'updated_at' => Carbon::now()->subHours(12),
            ],
        ];

        foreach ($inventoryItems as $item) {
            DB::table('inventory')->insert($item);
        }

        // 13. Create Invoices
        $invoices = [
            [
                'order_id' => $order1Id,
                'shipment_id' => $shipment1Id,
                'invoice_number' => 'INV-' . date('Y') . '-' . str_pad(1, 5, '0', STR_PAD_LEFT),
                'amount' => 18000.00,
                'tax' => 2160.00, // 12% VAT
                'total_amount' => 20160.00,
                'status' => 'sent',
                'due_date' => Carbon::now()->addDays(30),
                'generated_at' => Carbon::now()->subHours(12),
                'created_at' => Carbon::now()->subHours(12),
                'updated_at' => Carbon::now()->subHours(12),
            ],
        ];

        foreach ($invoices as $invoice) {
            DB::table('invoices')->insert($invoice);
        }

        // 14. Create Tracking History
        $trackingHistory = [
            [
                'shipment_id' => $shipment1Id,
                'status' => 'pending',
                'location' => 'Tagum Distribution Center',
                'details' => 'Shipment created and awaiting pickup',
                'timestamp' => Carbon::now()->subHours(12),
            ],
            [
                'shipment_id' => $shipment1Id,
                'status' => 'picked_up',
                'location' => 'Tagum Distribution Center',
                'details' => 'Package picked up by driver Jose',
                'timestamp' => Carbon::now()->subHours(10),
            ],
            [
                'shipment_id' => $shipment1Id,
                'status' => 'in_transit',
                'location' => 'Butuan City Checkpoint',
                'details' => 'In transit to Cebu City',
                'timestamp' => Carbon::now()->subHours(6),
            ],
            [
                'shipment_id' => $shipment1Id,
                'status' => 'in_transit',
                'location' => 'Near Cebu Ferry Terminal',
                'details' => 'Approaching destination',
                'timestamp' => Carbon::now()->subMinutes(30),
            ],
        ];

        foreach ($trackingHistory as $history) {
            DB::table('tracking_history')->insert($history);
        }

        echo "\n✅ Demo data seeded successfully!\n\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "📋 TEST ACCOUNTS FOR GPS TRACKING\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

        echo "🔐 ADMIN ACCESS:\n";
        echo "   Email: admin@logisync.com\n";
        echo "   Password: admin123\n";
        echo "   Role: Administrator\n\n";

        echo "📦 BOOKING MANAGERS:\n";
        echo "   1. juan@logisync.com / booking123\n";
        echo "   2. ana@logisync.com / booking123\n\n";

        echo "🏭 WAREHOUSE MANAGERS:\n";
        echo "   1. carlos@logisync.com / warehouse123\n";
        echo "   2. maria@logisync.com / warehouse123\n\n";

        echo "🚚 DRIVERS (For GPS Testing):\n";
        echo "   1. pedro@logisync.com / driver123 (Truck ABC-1234)\n";
        echo "   2. jose@logisync.com / driver123 (Van XYZ-5678) ⭐ ACTIVE\n";
        echo "   3. miguel@logisync.com / driver123 (Motorcycle MNO-9012)\n\n";

        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "📊 SAMPLE DATA CREATED:\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "   • 8 Users (1 admin, 2 warehouse, 2 booking, 3 drivers)\n";
        echo "   • 2 Warehouses (Davao Main, Tagum)\n";
        echo "   • 3 Vehicles (1 truck, 1 van, 1 motorcycle)\n";
        echo "   • 3 Quotes (1 pending, 2 approved)\n";
        echo "   • 2 Orders (confirmed)\n";
        echo "   • 2 Shipments (1 IN-TRANSIT with GPS ⭐, 1 pending)\n";
        echo "   • 5 GPS Location Points (Tagum → Cebu route)\n";
        echo "   • 1 Invoice (sent, unpaid)\n";
        echo "   • 3 Subscription Plans\n";
        echo "   • 1 Pricing Configuration (Philippine-focused)\n\n";

        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "🧪 GPS TESTING INSTRUCTIONS:\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "1. Login as Driver:\n";
        echo "   URL: /driver/login\n";
        echo "   Use: jose@logisync.com / driver123\n\n";

        echo "2. View Active Shipment:\n";
        echo "   Status: IN-TRANSIT (from Tagum to Cebu)\n";
        echo "   Current GPS: Near Cebu (10.3157, 123.8854)\n\n";

        echo "3. Start GPS Tracking:\n";
        echo "   Click 'Start GPS Tracking' button\n";
        echo "   Allow location permissions\n";
        echo "   Location updates every 20 seconds\n\n";

        echo "4. View Live Tracking (Admin/Manager):\n";
        echo "   Login as: admin@logisync.com / admin123\n";
        echo "   Dashboard → Live Tracking Widget\n";
        echo "   Click shipment to see map\n\n";

        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    }
}
