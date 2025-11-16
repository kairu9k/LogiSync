<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Remove customer_id and order_number from orders table.
     * - customer_id: Not used, customer info stored in orders.customer_name
     * - order_number: Redundant, we generate PO numbers on the fly from order_id
     */
    public function up(): void
    {
        // These columns were already removed in previous migrations
        // This migration is kept for documentation purposes
        // No action needed
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedInteger('customer_id')->nullable()->after('order_id');
            $table->string('order_number', 50)->nullable()->after('organization_id');

            $table->index('customer_id');
        });
    }
};
