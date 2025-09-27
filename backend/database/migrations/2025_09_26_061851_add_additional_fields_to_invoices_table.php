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
        Schema::table('invoices', function (Blueprint $table) {
            // Add shipment and quote relationships
            $table->unsignedInteger('shipment_id')->nullable()->after('order_id');
            $table->unsignedInteger('quote_id')->nullable()->after('shipment_id');

            // Add payment tracking fields
            $table->date('payment_date')->nullable()->after('status');
            $table->string('payment_method', 50)->nullable()->after('payment_date');
            $table->text('notes')->nullable()->after('payment_method');

            // Add indexes and foreign keys
            $table->index('shipment_id');
            $table->index('quote_id');
            $table->index('due_date');

            // Add foreign key constraints
            $table->foreign('shipment_id')->references('shipment_id')->on('shipments')->onDelete('set null')->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['shipment_id']);
            $table->dropIndex(['shipment_id']);
            $table->dropIndex(['quote_id']);
            $table->dropIndex(['due_date']);

            $table->dropColumn([
                'shipment_id',
                'quote_id',
                'payment_date',
                'payment_method',
                'notes'
            ]);
        });
    }
};
