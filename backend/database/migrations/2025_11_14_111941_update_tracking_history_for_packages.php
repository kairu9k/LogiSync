<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Update tracking_history to support both shipment-level and package-level tracking.
     */
    public function up(): void
    {
        Schema::table('tracking_history', function (Blueprint $table) {
            // Add detail_id to track individual packages in shipment_details
            $table->unsignedInteger('detail_id')->nullable()->after('shipment_id');
            $table->index('detail_id');

            // Foreign key to shipment_details
            $table->foreign('detail_id')
                  ->references('detail_id')
                  ->on('shipment_details')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');

            // Make shipment_id nullable (tracking can be for entire shipment OR specific package)
            $table->unsignedInteger('shipment_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tracking_history', function (Blueprint $table) {
            // Remove detail_id
            $table->dropForeign(['detail_id']);
            $table->dropIndex(['detail_id']);
            $table->dropColumn('detail_id');

            // Make shipment_id required again
            $table->unsignedInteger('shipment_id')->nullable(false)->change();
        });
    }
};
