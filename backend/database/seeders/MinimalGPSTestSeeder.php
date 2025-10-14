<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class MinimalGPSTestSeeder extends Seeder
{
    /**
     * Minimal seeder focused on GPS tracking testing
     * Only creates essential data for testing live tracking feature
     */
    public function run(): void
    {
        echo "\n🚀 Starting Minimal GPS Test Data Seeding...\n\n";

        // 1. Create Admin User
        $adminId = DB::table('users')->insertGetId([
            'username' => 'Admin User',
            'email' => 'admin@logisync.com',
            'password' => Hash::make('admin123'),
            'role' => 'admin',
            'email_verified' => true,
        ]);

        echo "✅ Created Admin: admin@logisync.com / admin123\n";

        // 2. Create Driver User (for GPS testing)
        $driverId = DB::table('users')->insertGetId([
            'username' => 'Jose Ramos',
            'email' => 'jose@logisync.com',
            'password' => Hash::make('driver123'),
            'role' => 'driver',
            'email_verified' => true,
        ]);

        echo "✅ Created Driver: jose@logisync.com / driver123\n";

        // 3. Create Pricing Config
        DB::table('pricing_config')->insert([
            'base_rate' => 100.00,
            'per_km_rate' => 15.00,
            'per_kg_rate' => 5.00,
            'fuel_surcharge_percent' => 10.00,
            'insurance_percent' => 2.00,
            'minimum_charge' => 200.00,
            'priority_multiplier' => 1.00,
            'express_multiplier' => 1.50,
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        echo "✅ Created Pricing Configuration\n";

        // 4. Create Warehouse
        $warehouseId = DB::table('warehouse')->insertGetId([
            'warehouse_name' => 'Tagum Distribution Center',
            'location' => 'National Highway, Tagum City, Davao del Norte',
        ]);

        echo "✅ Created Warehouse\n";

        // 5. Create Vehicle/Transport
        $transportId = DB::table('transport')->insertGetId([
            'vehicle_type' => 'Van',
            'license_plate' => 'XYZ-5678',
            'driver_id' => $driverId,
            'capacity_kg' => 1000,
            'status' => 'in_transit',
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        echo "✅ Created Vehicle: Van XYZ-5678\n";

        // 6. Create Quote
        $quoteId = DB::table('quotes')->insertGetId([
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
            'created_by' => $adminId,
            'created_at' => Carbon::now()->subDays(2),
            'updated_at' => Carbon::now()->subDays(1),
        ]);

        echo "✅ Created Quote\n";

        // 7. Create Order
        $orderId = DB::table('orders')->insertGetId([
            'customer_name' => 'XYZ Trading',
            'customer_email' => 'orders@xyztrading.com',
            'order_status' => 'confirmed',
            'total_cost' => 18000.00,
            'quote_id' => $quoteId,
            'created_by' => $adminId,
            'created_at' => Carbon::now()->subDay(),
            'updated_at' => Carbon::now()->subDay(),
        ]);

        echo "✅ Created Order\n";

        // 8. Create Shipment (IN-TRANSIT for GPS testing)
        $trackingNumber = 'LS-' . strtoupper(substr(md5(time()), 0, 10));
        $shipmentId = DB::table('shipments')->insertGetId([
            'tracking_number' => $trackingNumber,
            'receiver_name' => 'Juan Dela Cruz',
            'receiver_address' => '123 Osmeña Blvd, Cebu City, Philippines',
            'receiver_contact' => '+639171234567',
            'origin_name' => 'XYZ Trading',
            'origin_address' => 'National Highway, Tagum City, Davao del Norte',
            'destination_name' => 'Cebu Warehouse',
            'destination_address' => '123 Osmeña Blvd, Cebu City, Philippines',
            'creation_date' => Carbon::now()->subHours(10),
            'charges' => 1800000, // ₱18,000.00 in centavos
            'status' => 'in_transit',
            'departure_date' => Carbon::now()->subHours(8),
            'order_id' => $orderId,
            'transport_id' => $transportId,
        ]);

        echo "✅ Created Shipment: $trackingNumber (IN-TRANSIT)\n";

        // 9. Create GPS Location History (Tagum to Cebu route)
        $gpsLocations = [
            [
                'shipment_id' => $shipmentId,
                'latitude' => 7.4474, // Tagum City (starting point)
                'longitude' => 125.8078,
                'speed' => 0,
                'accuracy' => 10,
                'timestamp' => Carbon::now()->subHours(8),
                'created_at' => Carbon::now()->subHours(8),
                'updated_at' => Carbon::now()->subHours(8),
            ],
            [
                'shipment_id' => $shipmentId,
                'latitude' => 8.5000, // En route
                'longitude' => 125.3000,
                'speed' => 60,
                'accuracy' => 15,
                'timestamp' => Carbon::now()->subHours(6),
                'created_at' => Carbon::now()->subHours(6),
                'updated_at' => Carbon::now()->subHours(6),
            ],
            [
                'shipment_id' => $shipmentId,
                'latitude' => 8.9494, // Butuan City
                'longitude' => 125.5406,
                'speed' => 50,
                'accuracy' => 12,
                'timestamp' => Carbon::now()->subHours(4),
                'created_at' => Carbon::now()->subHours(4),
                'updated_at' => Carbon::now()->subHours(4),
            ],
            [
                'shipment_id' => $shipmentId,
                'latitude' => 9.7862, // En route to Surigao
                'longitude' => 125.4941,
                'speed' => 55,
                'accuracy' => 20,
                'timestamp' => Carbon::now()->subHours(2),
                'created_at' => Carbon::now()->subHours(2),
                'updated_at' => Carbon::now()->subHours(2),
            ],
            [
                'shipment_id' => $shipmentId,
                'latitude' => 10.3157, // Near Cebu (current location)
                'longitude' => 123.8854,
                'speed' => 0,
                'accuracy' => 8,
                'timestamp' => Carbon::now()->subMinutes(15),
                'created_at' => Carbon::now()->subMinutes(15),
                'updated_at' => Carbon::now()->subMinutes(15),
            ],
        ];

        foreach ($gpsLocations as $location) {
            DB::table('gps_locations')->insert($location);
        }

        echo "✅ Created 5 GPS Location Points\n\n";

        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "🎉 GPS TEST DATA READY!\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

        echo "📋 TEST CREDENTIALS:\n\n";

        echo "🔐 Admin Login:\n";
        echo "   Email: admin@logisync.com\n";
        echo "   Password: admin123\n";
        echo "   → View live tracking from Dashboard\n\n";

        echo "🚚 Driver Login:\n";
        echo "   Email: jose@logisync.com\n";
        echo "   Password: driver123\n";
        echo "   → Start GPS tracking from /driver/dashboard\n\n";

        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "🧪 GPS TESTING STEPS:\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

        echo "1. Driver Side (Mobile Device with GPS):\n";
        echo "   • Go to /driver/login\n";
        echo "   • Login: jose@logisync.com / driver123\n";
        echo "   • Click on active shipment ($trackingNumber)\n";
        echo "   • Click 'Start GPS Tracking'\n";
        echo "   • Allow location permissions\n";
        echo "   • Location will update every 20 seconds\n\n";

        echo "2. Admin Side (Desktop/Laptop):\n";
        echo "   • Go to /signin\n";
        echo "   • Login: admin@logisync.com / admin123\n";
        echo "   • View Dashboard\n";
        echo "   • Check 'Live Tracking' widget\n";
        echo "   • Click shipment to view on map\n";
        echo "   • Watch real-time updates from driver\n\n";

        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "📍 CURRENT GPS LOCATION:\n";
        echo "   Latitude: 10.3157 (Near Cebu City)\n";
        echo "   Longitude: 123.8854\n";
        echo "   Route: Tagum City → Cebu City\n";
        echo "   Status: IN-TRANSIT ⭐\n\n";

        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    }
}
