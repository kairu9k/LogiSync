<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedules', function (Blueprint $table) {
            $table->increments('schedule_id');
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->string('schedule_name', 255);
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->text('route_details')->nullable();

            $table->index('schedule_name');
            $table->index('start_time');
            $table->index('organization_id');

            $table->foreign('organization_id')->references('organization_id')->on('organizations')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};
