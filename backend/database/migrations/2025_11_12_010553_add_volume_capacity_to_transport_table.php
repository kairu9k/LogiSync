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
        Schema::table('transport', function (Blueprint $table) {
            // Add volume capacity in cubic meters (m³)
            // Common capacities: Small Van (10-15), Medium Truck (25-35), Large Truck (40-60)
            $table->decimal('volume_capacity', 10, 2)->nullable()->after('capacity')->comment('Volume capacity in cubic meters (m³)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transport', function (Blueprint $table) {
            $table->dropColumn('volume_capacity');
        });
    }
};
