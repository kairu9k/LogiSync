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
        Schema::table('shipments', function (Blueprint $table) {
            // Drop the unique constraint on tracking_number
            // This allows multiple shipment records to share the same tracking number (for multi-package shipments)
            $table->dropUnique('shipments_tracking_number_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            // Restore the unique constraint
            $table->unique('tracking_number', 'shipments_tracking_number_unique');
        });
    }
};
