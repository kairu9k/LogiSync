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
     * Change shipment_id from auto-increment integer to string (format: SHP-XXXXXX)
     * Remove master_tracking_number field as shipment_id will serve as the main identifier
     */
    public function up(): void
    {
        // Drop foreign keys that reference shipment_id (if they exist)
        try {
            Schema::table('shipment_details', function (Blueprint $table) {
                $table->dropForeign(['shipment_id']);
            });
        } catch (\Exception $e) {
            // Foreign key might not exist or have different name
        }

        try {
            Schema::table('tracking_history', function (Blueprint $table) {
                $table->dropForeign(['shipment_id']);
            });
        } catch (\Exception $e) {
            // Foreign key might not exist or have different name
        }

        // Drop gps_locations foreign key if table exists
        if (Schema::hasTable('gps_locations')) {
            try {
                Schema::table('gps_locations', function (Blueprint $table) {
                    $table->dropForeign(['shipment_id']);
                });
            } catch (\Exception $e) {
                // Foreign key might not exist or have different name
            }
        }

        // Drop invoices foreign key if it exists
        if (Schema::hasTable('invoices')) {
            try {
                Schema::table('invoices', function (Blueprint $table) {
                    $table->dropForeign(['shipment_id']);
                });
            } catch (\Exception $e) {
                // Foreign key might not exist or have different name
            }
        }

        // Change shipment_id to string in shipments table
        Schema::table('shipments', function (Blueprint $table) {
            // Drop auto-increment and change to string
            DB::statement('ALTER TABLE shipments MODIFY shipment_id VARCHAR(50) NOT NULL');

            // Drop master_tracking_number if it exists
            if (Schema::hasColumn('shipments', 'master_tracking_number')) {
                $table->dropColumn('master_tracking_number');
            }
        });

        // Change shipment_id to string in related tables
        Schema::table('shipment_details', function (Blueprint $table) {
            DB::statement('ALTER TABLE shipment_details MODIFY shipment_id VARCHAR(50) NOT NULL');
        });

        Schema::table('tracking_history', function (Blueprint $table) {
            DB::statement('ALTER TABLE tracking_history MODIFY shipment_id VARCHAR(50) NULL');
        });

        if (Schema::hasTable('gps_locations')) {
            Schema::table('gps_locations', function (Blueprint $table) {
                DB::statement('ALTER TABLE gps_locations MODIFY shipment_id VARCHAR(50) NULL');
            });
        }

        if (Schema::hasTable('invoices')) {
            Schema::table('invoices', function (Blueprint $table) {
                DB::statement('ALTER TABLE invoices MODIFY shipment_id VARCHAR(50) NULL');
            });
        }

        // Re-add foreign keys with new string type
        Schema::table('shipment_details', function (Blueprint $table) {
            $table->foreign('shipment_id')
                  ->references('shipment_id')
                  ->on('shipments')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');
        });

        Schema::table('tracking_history', function (Blueprint $table) {
            $table->foreign('shipment_id')
                  ->references('shipment_id')
                  ->on('shipments')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');
        });

        if (Schema::hasTable('gps_locations')) {
            Schema::table('gps_locations', function (Blueprint $table) {
                $table->foreign('shipment_id')
                      ->references('shipment_id')
                      ->on('shipments')
                      ->onDelete('cascade')
                      ->onUpdate('cascade');
            });
        }

        if (Schema::hasTable('invoices')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->foreign('shipment_id')
                      ->references('shipment_id')
                      ->on('shipments')
                      ->onDelete('set null')
                      ->onUpdate('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop foreign keys
        Schema::table('shipment_details', function (Blueprint $table) {
            $table->dropForeign(['shipment_id']);
        });

        Schema::table('tracking_history', function (Blueprint $table) {
            $table->dropForeign(['shipment_id']);
        });

        // Change back to integer auto-increment
        Schema::table('shipments', function (Blueprint $table) {
            DB::statement('ALTER TABLE shipments MODIFY shipment_id INT UNSIGNED AUTO_INCREMENT');
            $table->string('master_tracking_number', 50)->nullable()->unique();
        });

        Schema::table('shipment_details', function (Blueprint $table) {
            DB::statement('ALTER TABLE shipment_details MODIFY shipment_id INT UNSIGNED NOT NULL');
        });

        Schema::table('tracking_history', function (Blueprint $table) {
            DB::statement('ALTER TABLE tracking_history MODIFY shipment_id INT UNSIGNED NULL');
        });

        // Re-add foreign keys
        Schema::table('shipment_details', function (Blueprint $table) {
            $table->foreign('shipment_id')
                  ->references('shipment_id')
                  ->on('shipments')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');
        });

        Schema::table('tracking_history', function (Blueprint $table) {
            $table->foreign('shipment_id')
                  ->references('shipment_id')
                  ->on('shipments')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');
        });
    }
};
