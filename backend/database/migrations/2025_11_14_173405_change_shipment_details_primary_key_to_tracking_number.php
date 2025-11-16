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
     * Change shipment_details primary key from detail_id to tracking_number.
     * This makes tracking_number the unique identifier for packages instead of detail_id.
     */
    public function up(): void
    {
        // Step 1: Drop foreign key from tracking_history that references detail_id
        try {
            Schema::table('tracking_history', function (Blueprint $table) {
                $table->dropForeign(['detail_id']);
            });
        } catch (\Exception $e) {
            // Foreign key might not exist
        }

        // Step 2: Add tracking_number column to tracking_history
        // Check if detail_id and tracking_number exist first
        $hasDetailId = Schema::hasColumn('tracking_history', 'detail_id');
        $hasTrackingNumber = Schema::hasColumn('tracking_history', 'tracking_number');

        if (!$hasTrackingNumber) {
            Schema::table('tracking_history', function (Blueprint $table) use ($hasDetailId) {
                // Add new tracking_number column
                if ($hasDetailId) {
                    $table->string('tracking_number', 255)->nullable()->after('detail_id');
                } else {
                    $table->string('tracking_number', 255)->nullable()->after('shipment_id');
                }
                $table->index('tracking_number');
            });
        }

        // Step 3: Migrate data from detail_id to tracking_number in tracking_history (only if detail_id exists)
        if ($hasDetailId) {
            DB::statement('
                UPDATE tracking_history th
                INNER JOIN shipment_details sd ON th.detail_id = sd.detail_id
                SET th.tracking_number = sd.tracking_number
                WHERE th.detail_id IS NOT NULL
            ');

            // Step 4: Remove detail_id from tracking_history
            Schema::table('tracking_history', function (Blueprint $table) {
                $table->dropIndex(['detail_id']);
                $table->dropColumn('detail_id');
            });
        }

        // Step 5: Drop primary key from shipment_details and make tracking_number the primary key
        $detailIdExists = Schema::hasColumn('shipment_details', 'detail_id');

        if ($detailIdExists) {
            Schema::table('shipment_details', function (Blueprint $table) {
                // Drop auto-increment from detail_id
                DB::statement('ALTER TABLE shipment_details MODIFY detail_id INT UNSIGNED NOT NULL');
                // Drop primary key
                $table->dropPrimary(['detail_id']);
                // Remove detail_id column
                $table->dropColumn('detail_id');
            });
        }

        // Step 5b: Drop unique constraint on tracking_number if it exists, then set as primary key
        try {
            Schema::table('shipment_details', function (Blueprint $table) {
                $table->dropUnique(['tracking_number']);
            });
        } catch (\Exception $e) {
            // Unique constraint might not exist
        }

        // Only set primary key if not already set
        try {
            Schema::table('shipment_details', function (Blueprint $table) {
                // Set tracking_number as primary key
                $table->primary('tracking_number');
            });
        } catch (\Exception $e) {
            // Primary key might already be set
        }

        // Step 6: Add foreign key from tracking_history to shipment_details using tracking_number
        Schema::table('tracking_history', function (Blueprint $table) {
            $table->foreign('tracking_number')
                  ->references('tracking_number')
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
        // Remove foreign key from tracking_history
        try {
            Schema::table('tracking_history', function (Blueprint $table) {
                $table->dropForeign(['tracking_number']);
            });
        } catch (\Exception $e) {
            // Foreign key might not exist
        }

        // Re-add detail_id as primary key to shipment_details
        Schema::table('shipment_details', function (Blueprint $table) {
            $table->dropPrimary(['tracking_number']);
            $table->increments('detail_id')->first();
            $table->primary('detail_id');
        });

        // Migrate tracking_number back to detail_id in tracking_history
        Schema::table('tracking_history', function (Blueprint $table) {
            $table->unsignedInteger('detail_id')->nullable()->after('shipment_id');
            $table->index('detail_id');
        });

        DB::statement('
            UPDATE tracking_history th
            INNER JOIN shipment_details sd ON th.tracking_number = sd.tracking_number
            SET th.detail_id = sd.detail_id
            WHERE th.tracking_number IS NOT NULL
        ');

        // Remove tracking_number from tracking_history
        Schema::table('tracking_history', function (Blueprint $table) {
            $table->dropIndex(['tracking_number']);
            $table->dropColumn('tracking_number');
        });

        // Re-add foreign key to detail_id
        Schema::table('tracking_history', function (Blueprint $table) {
            $table->foreign('detail_id')
                  ->references('detail_id')
                  ->on('shipment_details')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');
        });
    }
};
