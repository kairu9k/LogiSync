<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UsersTableSeeder extends Seeder
{
    public function run(): void
    {
        // Insert or update core users by unique username
        $users = [
            [
                'username' => 'admin01',
                'password' => Hash::make('Admin@12345'),
                'role' => 'admin',
                'email' => 'admin@logisync.com',
            ],
            [
                'username' => 'warehouse_mgr',
                'password' => Hash::make('Warehouse@12345'),
                'role' => 'warehouse_manager',
                'email' => 'warehouse@logisync.com',
            ],
            [
                'username' => 'driver01',
                'password' => Hash::make('Driver@12345'),
                'role' => 'driver',
                'email' => 'driver01@logisync.com',
            ],
            [
                'username' => 'booking_mgr',
                'password' => Hash::make('Booking@12345'),
                'role' => 'booking_manager',
                'email' => 'booking@logisync.com',
            ],
        ];

        foreach ($users as $u) {
            DB::table('users')->updateOrInsert(
                ['username' => $u['username']],
                [
                    'password' => $u['password'],
                    'role' => $u['role'],
                    'email' => $u['email'],
                ]
            );
        }
    }
}
