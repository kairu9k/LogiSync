<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('transport')) {
            Schema::create('transport', function (Blueprint $table) {
                $table->increments('transport_id');
                $table->string('vehicle_id', 255);
                $table->string('vehicle_type', 255);
                $table->string('registration_number', 255)->unique();
                $table->string('capacity', 255);
                $table->text('safety_compliance_details')->nullable();
                $table->unsignedInteger('budget_id');
                $table->unsignedInteger('schedule_id');
                $table->unsignedInteger('driver_id');

                $table->index('vehicle_id');
                $table->index('driver_id');
                $table->index('budget_id');
                $table->index('schedule_id');

                $table->foreign('driver_id')->references('user_id')->on('users')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign('budget_id')->references('budget_id')->on('budgets')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign('schedule_id')->references('schedule_id')->on('schedules')->onDelete('cascade')->onUpdate('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('transport');
    }
};
