<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_config', function (Blueprint $table) {
            $table->id('config_id');
            $table->decimal('base_rate', 10, 2)->default(100.00);
            $table->decimal('per_km_rate', 10, 2)->default(15.00);
            $table->decimal('per_kg_rate', 10, 2)->default(5.00);
            $table->decimal('fuel_surcharge_percent', 5, 2)->default(10.00);
            $table->decimal('insurance_percent', 5, 2)->default(2.00);
            $table->decimal('minimum_charge', 10, 2)->default(200.00);
            $table->decimal('priority_multiplier', 5, 2)->default(1.50);
            $table->decimal('express_multiplier', 5, 2)->default(2.00);
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->timestamp('created_at')->useCurrent();
        });

        // Insert default pricing configuration
        DB::table('pricing_config')->insert([
            'base_rate' => 100.00,
            'per_km_rate' => 15.00,
            'per_kg_rate' => 5.00,
            'fuel_surcharge_percent' => 10.00,
            'insurance_percent' => 2.00,
            'minimum_charge' => 200.00,
            'priority_multiplier' => 1.00,
            'express_multiplier' => 1.50,
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing_config');
    }
};
