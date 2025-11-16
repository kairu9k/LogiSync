<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Remove schedules table as it is redundant.
     * Shipments table already has departure_date field for scheduling.
     * No foreign key relationships exist between schedules and shipments.
     */
    public function up(): void
    {
        Schema::dropIfExists('schedules');
    }

    /**
     * Reverse the migrations.
     *
     * Recreate schedules table structure if needed for rollback.
     */
    public function down(): void
    {
        Schema::create('schedules', function (Blueprint $table) {
            $table->increments('schedule_id');
            $table->unsignedBigInteger('organization_id');
            $table->string('schedule_name', 255);
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->text('route_details')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('organization_id');
            $table->index('start_time');

            // Foreign key
            $table->foreign('organization_id')
                  ->references('organization_id')
                  ->on('organizations')
                  ->onDelete('cascade');
        });
    }
};
