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
     * CRITICAL: Add organization_id to shipments table for multi-tenant isolation
     * This prevents data leaks between organizations
     */
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            // Add organization_id column after shipment_id
            $table->unsignedBigInteger('organization_id')->after('shipment_id');

            // Add index for performance
            $table->index('organization_id');
        });

        // Populate organization_id from related orders
        // Check if shipment_details exists (normalized schema) or use direct order relation
        if (Schema::hasTable('shipment_details')) {
            DB::statement("
                UPDATE shipments s
                INNER JOIN shipment_details sd ON s.shipment_id = sd.shipment_id
                INNER JOIN orders o ON sd.order_id = o.order_id
                SET s.organization_id = o.organization_id
            ");
        } else {
            // For fresh migrations, populate from orders table directly
            DB::statement("
                UPDATE shipments s
                INNER JOIN orders o ON s.order_id = o.order_id
                SET s.organization_id = o.organization_id
            ");
        }

        // Add foreign key constraint
        Schema::table('shipments', function (Blueprint $table) {
            $table->foreign('organization_id')
                  ->references('organization_id')
                  ->on('organizations')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropIndex(['organization_id']);
            $table->dropColumn('organization_id');
        });
    }
};
