<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SubscriptionPlansSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing plans
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('subscriptions')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Insert subscription plans
        DB::table('subscriptions')->insert([
            [
                'plan_name' => 'Free',
                'slug' => 'free',
                'description' => 'Perfect for getting started with basic logistics management',
                'price' => 0,
                'term_months' => 1,
                'paymongo_payment_link_id' => null,
                'active' => true,
            ],
            [
                'plan_name' => 'Pro',
                'slug' => 'pro',
                'description' => 'Advanced features for growing logistics businesses in Davao',
                'price' => 499,
                'term_months' => 1,
                'paymongo_payment_link_id' => null,
                'active' => true,
            ],
            [
                'plan_name' => 'Enterprise',
                'slug' => 'enterprise',
                'description' => 'Full-featured solution with priority support and unlimited shipments',
                'price' => 999,
                'term_months' => 1,
                'paymongo_payment_link_id' => null,
                'active' => true,
            ],
        ]);
    }
}
