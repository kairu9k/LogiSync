<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->increments('invoice_id');
            $table->string('invoice_number', 20)->unique()->nullable();
            $table->unsignedInteger('order_id');
            $table->unsignedInteger('shipment_id')->nullable();
            $table->unsignedInteger('quote_id')->nullable();
            $table->string('invoice_type', 255);
            $table->date('invoice_date');
            $table->date('due_date');
            $table->integer('amount');
            $table->string('status', 50)->default('pending');
            $table->date('payment_date')->nullable();
            $table->string('payment_method', 50)->nullable();
            $table->text('notes')->nullable();

            $table->index('order_id');
            $table->index('shipment_id');
            $table->index('quote_id');
            $table->index('status');
            $table->index('invoice_date');
            $table->index('due_date');

            $table->foreign('order_id')->references('order_id')->on('orders')->onDelete('cascade')->onUpdate('cascade');
            $table->foreign('shipment_id')->references('shipment_id')->on('shipments')->onDelete('set null')->onUpdate('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
