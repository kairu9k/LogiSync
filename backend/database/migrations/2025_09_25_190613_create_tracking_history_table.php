<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('tracking_history')) {
            Schema::create('tracking_history', function (Blueprint $table) {
                $table->increments('tracking_history_id');
                $table->unsignedInteger('shipment_id');
                $table->timestamp('timestamp')->useCurrent();
                $table->string('location', 255);
                $table->string('status', 50);
                $table->text('details')->nullable();

                $table->index('shipment_id');
                $table->index('timestamp');
                $table->index('status');

                $table->foreign('shipment_id')->references('shipment_id')->on('shipments')->onDelete('cascade')->onUpdate('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tracking_history');
    }
};
