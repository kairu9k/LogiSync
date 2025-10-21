<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add order_number to orders table
        Schema::table('orders', function (Blueprint $table) {
            $table->string('order_number', 20)->unique()->nullable()->after('order_id');
        });

        // Add invoice_number to invoices table
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('invoice_number', 20)->unique()->nullable()->after('invoice_id');
        });

        // Add quote_number to quotes table
        Schema::table('quotes', function (Blueprint $table) {
            $table->string('quote_number', 20)->unique()->nullable()->after('quote_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('order_number');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('invoice_number');
        });

        Schema::table('quotes', function (Blueprint $table) {
            $table->dropColumn('quote_number');
        });
    }
};
