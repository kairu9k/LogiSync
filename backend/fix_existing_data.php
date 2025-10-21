<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Checking users...\n";
$users = DB::table('users')->select('user_id', 'username', 'email')->get();
echo "Found " . $users->count() . " users:\n";
foreach ($users as $user) {
    echo "  - ID: {$user->user_id}, Name: {$user->username}, Email: {$user->email}\n";
}

echo "\nWhat is the user_id of your main admin user (the one with existing data)? ";
$mainUserId = (int) trim(fgets(STDIN));

if (!$mainUserId) {
    echo "Invalid user ID. Exiting.\n";
    exit(1);
}

echo "\nAssigning all existing data to user_id: {$mainUserId}...\n";

// Update warehouse
$warehouseCount = DB::table('warehouse')->whereNull('user_id')->update(['user_id' => $mainUserId]);
echo "Updated {$warehouseCount} warehouses\n";

// Update transport
$transportCount = DB::table('transport')->whereNull('user_id')->update(['user_id' => $mainUserId]);
echo "Updated {$transportCount} transport vehicles\n";

echo "\nDone! User {$mainUserId} now owns all existing data.\n";
