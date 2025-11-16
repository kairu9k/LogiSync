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
     * CRITICAL SECURITY FIX: Add organization_id to inventory table
     * This fixes the data leak issue identified in commit 2c5a40a
     * Previously inventory data could leak between organizations
     */
    public function up(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
            // Add organization_id column after inventory_id
            $table->unsignedBigInteger('organization_id')->after('inventory_id');

            // Add index for performance
            $table->index('organization_id');
        });

        // Populate organization_id from warehouse
        DB::statement("
            UPDATE inventory inv
            INNER JOIN warehouse w ON inv.warehouse_id = w.warehouse_id
            SET inv.organization_id = w.organization_id
        ");

        // Add foreign key constraint
        Schema::table('inventory', function (Blueprint $table) {
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
        Schema::table('inventory', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropIndex(['organization_id']);
            $table->dropColumn('organization_id');
        });
    }
};
