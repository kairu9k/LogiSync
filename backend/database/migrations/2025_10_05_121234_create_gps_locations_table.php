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
        Schema::create('gps_locations', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('shipment_id');
            $table->unsignedInteger('driver_id');
            $table->decimal('latitude', 10, 8); // e.g., 7.07306000
            $table->decimal('longitude', 11, 8); // e.g., 125.61278000
            $table->decimal('speed', 8, 2)->nullable(); // km/h
            $table->decimal('accuracy', 8, 2)->nullable(); // meters
            $table->timestamp('recorded_at')->useCurrent();
            $table->timestamps();

            $table->foreign('shipment_id')->references('shipment_id')->on('shipments')->onDelete('cascade');
            $table->foreign('driver_id')->references('user_id')->on('users')->onDelete('cascade');

            $table->index(['shipment_id', 'recorded_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gps_locations');
    }
};
