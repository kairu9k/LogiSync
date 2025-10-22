<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->increments('order_id');
            $table->string('order_number', 20)->unique()->nullable();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedInteger('quote_id')->nullable();
            $table->string('customer_name')->nullable();
            $table->timestamp('order_date')->useCurrent();
            $table->string('order_status', 50)->default('pending');

            $table->index('organization_id');
            $table->index('quote_id');
            $table->index('order_status');
            $table->index('order_date');

            $table->foreign('organization_id')->references('organization_id')->on('organizations')->onDelete('cascade');
            $table->foreign('quote_id')->references('quote_id')->on('quotes')->onDelete('set null')->onUpdate('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
