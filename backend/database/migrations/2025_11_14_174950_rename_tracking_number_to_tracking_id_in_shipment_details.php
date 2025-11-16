<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Rename tracking_number to tracking_id in shipment_details table
     * and move it to the first column position for consistency with other tables.
     */
    public function up(): void
    {
        // Step 1: Drop foreign key from tracking_history
        try {
            Schema::table('tracking_history', function (Blueprint $table) {
                $table->dropForeign(['tracking_number']);
            });
        } catch (\Exception $e) {
            // Foreign key might not exist
        }

        // Step 2: Drop primary key from shipment_details
        try {
            Schema::table('shipment_details', function (Blueprint $table) {
                $table->dropPrimary(['tracking_number']);
            });
        } catch (\Exception $e) {
            // Primary key might not exist
        }

        // Step 3: Rename tracking_number to tracking_id in shipment_details and move to first position
        DB::statement('ALTER TABLE shipment_details CHANGE tracking_number tracking_id VARCHAR(255) NOT NULL FIRST');

        // Step 4: Set tracking_id as primary key
        Schema::table('shipment_details', function (Blueprint $table) {
            $table->primary('tracking_id');
        });

        // Step 5: Rename tracking_number to tracking_id in tracking_history
        Schema::table('tracking_history', function (Blueprint $table) {
            $table->renameColumn('tracking_number', 'tracking_id');
        });

        // Step 6: Re-add foreign key using tracking_id
        Schema::table('tracking_history', function (Blueprint $table) {
            $table->foreign('tracking_id')
                  ->references('tracking_id')
                  ->on('shipment_details')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove foreign key
        try {
            Schema::table('tracking_history', function (Blueprint $table) {
                $table->dropForeign(['tracking_id']);
            });
        } catch (\Exception $e) {
            // Foreign key might not exist
        }

        // Rename back in tracking_history
        Schema::table('tracking_history', function (Blueprint $table) {
            $table->renameColumn('tracking_id', 'tracking_number');
        });

        // Drop primary key from shipment_details
        try {
            Schema::table('shipment_details', function (Blueprint $table) {
                $table->dropPrimary(['tracking_id']);
            });
        } catch (\Exception $e) {
            // Primary key might not exist
        }

        // Rename back in shipment_details
        DB::statement('ALTER TABLE shipment_details CHANGE tracking_id tracking_number VARCHAR(255) NOT NULL');

        // Re-add primary key
        Schema::table('shipment_details', function (Blueprint $table) {
            $table->primary('tracking_number');
        });

        // Re-add foreign key
        Schema::table('tracking_history', function (Blueprint $table) {
            $table->foreign('tracking_number')
                  ->references('tracking_number')
                  ->on('shipment_details')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');
        });
    }
};
