<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('invoices')) {
            Schema::create('invoices', function (Blueprint $table) {
                $table->increments('invoice_id');
                $table->integer('order_id');
                $table->string('invoice_type', 255);
                $table->date('invoice_date');
                $table->date('due_date');
                $table->integer('amount');
                $table->string('status', 50)->default('pending');

                $table->index('order_id');
                $table->index('status');
                $table->index('invoice_date');

                $table->foreign('order_id')->references('order_id')->on('orders')->onDelete('cascade')->onUpdate('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
