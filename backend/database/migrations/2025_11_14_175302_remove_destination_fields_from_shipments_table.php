<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Remove destination_name and destination_address from shipments table.
     * These fields are redundant because:
     * - Each package in shipment_details has its own receiver_name and receiver_address
     * - A shipment can have multiple packages going to different destinations
     * - The destination information should be stored at the package level, not shipment level
     */
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn(['destination_name', 'destination_address']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->string('destination_name', 255)->nullable()->after('origin_address');
            $table->text('destination_address')->nullable()->after('destination_name');
        });
    }
};
