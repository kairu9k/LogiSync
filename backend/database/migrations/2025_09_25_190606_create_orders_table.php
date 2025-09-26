<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('orders')) {
            Schema::create('orders', function (Blueprint $table) {
                $table->increments('order_id');
                $table->timestamp('order_date')->useCurrent();
                $table->unsignedInteger('user_id');
                $table->string('order_status', 50)->default('pending');

                $table->index('user_id');
                $table->index('order_status');
                $table->index('order_date');

                $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade')->onUpdate('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
