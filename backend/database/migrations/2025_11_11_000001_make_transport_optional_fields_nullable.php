<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transport', function (Blueprint $table) {
            // Drop foreign key constraints first
            $table->dropForeign(['driver_id']);
            $table->dropForeign(['budget_id']);
            $table->dropForeign(['schedule_id']);

            // Drop indexes
            $table->dropIndex(['driver_id']);
            $table->dropIndex(['budget_id']);
            $table->dropIndex(['schedule_id']);
        });

        Schema::table('transport', function (Blueprint $table) {
            // Make columns nullable
            $table->unsignedInteger('driver_id')->nullable()->change();
            $table->unsignedInteger('budget_id')->nullable()->change();
            $table->unsignedInteger('schedule_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('transport', function (Blueprint $table) {
            // Make columns NOT NULL again
            $table->unsignedInteger('driver_id')->nullable(false)->change();
            $table->unsignedInteger('budget_id')->nullable(false)->change();
            $table->unsignedInteger('schedule_id')->nullable(false)->change();

            // Re-add indexes
            $table->index('driver_id');
            $table->index('budget_id');
            $table->index('schedule_id');

            // Re-add foreign key constraints
            $table->foreign('driver_id')->references('user_id')->on('users')->onDelete('cascade')->onUpdate('cascade');
            $table->foreign('budget_id')->references('budget_id')->on('budgets')->onDelete('cascade')->onUpdate('cascade');
            $table->foreign('schedule_id')->references('schedule_id')->on('schedules')->onDelete('cascade')->onUpdate('cascade');
        });
    }
};
