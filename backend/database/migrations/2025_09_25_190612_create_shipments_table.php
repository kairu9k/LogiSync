<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('shipments')) {
            Schema::create('shipments', function (Blueprint $table) {
                $table->increments('shipment_id');
                $table->string('tracking_number', 255)->unique();
                $table->string('receiver_name', 255);
                $table->text('receiver_address');
                $table->string('origin_name', 255);
                $table->text('origin_address');
                $table->string('destination_name', 255);
                $table->text('destination_address');
                $table->timestamp('creation_date')->useCurrent();
                $table->integer('charges');
                $table->string('status', 50)->default('pending');
                $table->date('departure_date')->nullable();
                $table->integer('order_id');
                $table->integer('transport_id');

                $table->index('order_id');
                $table->index('transport_id');
                $table->index('status');
                $table->index('creation_date');

                $table->foreign('order_id')->references('order_id')->on('orders')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign('transport_id')->references('transport_id')->on('transport')->onDelete('cascade')->onUpdate('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
