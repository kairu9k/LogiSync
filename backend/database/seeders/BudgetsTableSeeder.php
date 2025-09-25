<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BudgetsTableSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            [
                'budget_name' => 'Q1 2024 Transport Budget',
                'start_date' => '2024-01-01',
                'end_date' => '2024-03-31',
                'total_budget' => 50000,
            ],
            [
                'budget_name' => 'Annual Fleet Budget',
                'start_date' => '2024-01-01',
                'end_date' => '2024-12-31',
                'total_budget' => 200000,
            ],
            [
                'budget_name' => 'Emergency Transport Fund',
                'start_date' => '2024-01-01',
                'end_date' => '2024-12-31',
                'total_budget' => 25000,
            ],
        ];

        foreach ($rows as $r) {
            DB::table('budgets')->updateOrInsert(
                [
                    'budget_name' => $r['budget_name'],
                    'start_date' => $r['start_date'],
                ],
                [
                    'end_date' => $r['end_date'],
                    'total_budget' => $r['total_budget'],
                ]
            );
        }
    }
}
