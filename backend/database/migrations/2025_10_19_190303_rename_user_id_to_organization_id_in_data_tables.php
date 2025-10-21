<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Tables that have user_id column that should become organization_id
        $tables = ['orders', 'budgets', 'schedules', 'transport', 'quotes', 'warehouse'];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->renameColumn('user_id', 'organization_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverse the changes
        $tables = ['orders', 'budgets', 'schedules', 'transport', 'quotes', 'warehouse'];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->renameColumn('organization_id', 'user_id');
            });
        }
    }
};
