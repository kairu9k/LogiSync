<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add unique constraints on business identifiers per organization
     * This ensures that order numbers, quote numbers, invoice numbers, and warehouse names
     * are unique within each organization
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->unique(['order_number', 'organization_id'], 'uk_order_number_org');
        });

        Schema::table('quotes', function (Blueprint $table) {
            $table->unique(['quote_number', 'organization_id'], 'uk_quote_number_org');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->unique(['invoice_number', 'organization_id'], 'uk_invoice_number_org');
        });

        Schema::table('warehouse', function (Blueprint $table) {
            $table->unique(['warehouse_name', 'organization_id'], 'uk_warehouse_name_org');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique('uk_order_number_org');
        });

        Schema::table('quotes', function (Blueprint $table) {
            $table->dropUnique('uk_quote_number_org');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique('uk_invoice_number_org');
        });

        Schema::table('warehouse', function (Blueprint $table) {
            $table->dropUnique('uk_warehouse_name_org');
        });
    }
};
