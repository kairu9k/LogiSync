<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('inventory')) {
            Schema::create('inventory', function (Blueprint $table) {
                $table->increments('inventory_id');
                $table->integer('warehouse_id');
                $table->string('location_in_warehouse', 255);
                $table->integer('order_details_id');

                $table->index('warehouse_id');
                $table->index('order_details_id');

                $table->foreign('warehouse_id')->references('warehouse_id')->on('warehouse')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign('order_details_id')->references('order_details_id')->on('order_details')->onDelete('cascade')->onUpdate('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory');
    }
};
