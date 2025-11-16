<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transport', function (Blueprint $table) {
            // Drop the columns completely
            $table->dropColumn(['driver_id', 'budget_id', 'schedule_id']);
        });
    }

    public function down(): void
    {
        Schema::table('transport', function (Blueprint $table) {
            // Re-add columns as nullable (since we removed constraints in previous migration)
            $table->unsignedInteger('driver_id')->nullable();
            $table->unsignedInteger('budget_id')->nullable();
            $table->unsignedInteger('schedule_id')->nullable();
        });
    }
};
