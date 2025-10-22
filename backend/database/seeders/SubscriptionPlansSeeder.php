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
        // Define subscription plans
        $plans = [
            [
                'slug' => 'free',
                'plan_name' => 'Free',
                'description' => 'Perfect for getting started with basic logistics management',
                'price' => 0,
                'term_months' => 1,
                'paymongo_payment_link_id' => null,
                'active' => true,
            ],
            [
                'slug' => 'pro',
                'plan_name' => 'Pro',
                'description' => 'Advanced features for growing logistics businesses in Davao',
                'price' => 499,
                'term_months' => 1,
                'paymongo_payment_link_id' => null,
                'active' => true,
            ],
            [
                'slug' => 'enterprise',
                'plan_name' => 'Enterprise',
                'description' => 'Full-featured solution with priority support and unlimited shipments',
                'price' => 999,
                'term_months' => 1,
                'paymongo_payment_link_id' => null,
                'active' => true,
            ],
        ];

        // Insert or update subscription plans (prevents duplicates)
        foreach ($plans as $plan) {
            DB::table('subscriptions')->updateOrInsert(
                ['slug' => $plan['slug']], // Match by slug
                $plan // Update or insert all fields
            );
        }
    }
}
