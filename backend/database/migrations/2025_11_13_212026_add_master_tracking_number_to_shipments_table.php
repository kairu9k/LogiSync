<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            // Add master_tracking_number for grouping multiple packages together (internal use)
            // tracking_number will be unique per order/package (customer-facing)
            $table->string('master_tracking_number', 50)->after('tracking_number')->nullable()->index();
        });

        // Migrate existing data: copy tracking_number to master_tracking_number
        DB::table('shipments')->update(['master_tracking_number' => DB::raw('tracking_number')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn('master_tracking_number');
        });
    }
};
