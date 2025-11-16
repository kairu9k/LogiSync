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
     * CRITICAL: Add organization_id to order_details table for multi-tenant isolation
     */
    public function up(): void
    {
        Schema::table('order_details', function (Blueprint $table) {
            // Add organization_id column after order_details_id
            $table->unsignedBigInteger('organization_id')->after('order_details_id');

            // Add index for performance
            $table->index('organization_id');
        });

        // Populate organization_id from related orders
        DB::statement("
            UPDATE order_details od
            INNER JOIN orders o ON od.order_id = o.order_id
            SET od.organization_id = o.organization_id
        ");

        // Add foreign key constraint
        Schema::table('order_details', function (Blueprint $table) {
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
        Schema::table('order_details', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropIndex(['organization_id']);
            $table->dropColumn('organization_id');
        });
    }
};
