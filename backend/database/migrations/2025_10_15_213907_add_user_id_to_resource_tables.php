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
        // Add user_id to warehouse table
        if (!Schema::hasColumn('warehouse', 'user_id')) {
            Schema::table('warehouse', function (Blueprint $table) {
                $table->unsignedInteger('user_id')->nullable()->after('warehouse_id');
                $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
                $table->index('user_id');
            });
        }

        // Add user_id to transport table
        if (!Schema::hasColumn('transport', 'user_id')) {
            Schema::table('transport', function (Blueprint $table) {
                $table->unsignedInteger('user_id')->nullable()->after('transport_id');
                $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
                $table->index('user_id');
            });
        }

        // Add user_id to schedules table (if table exists)
        if (Schema::hasTable('schedules') && !Schema::hasColumn('schedules', 'user_id')) {
            Schema::table('schedules', function (Blueprint $table) {
                $table->unsignedInteger('user_id')->nullable()->after('schedule_id');
                $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
                $table->index('user_id');
            });
        }

        // Add user_id to budgets table (if table exists)
        if (Schema::hasTable('budgets') && !Schema::hasColumn('budgets', 'user_id')) {
            Schema::table('budgets', function (Blueprint $table) {
                $table->unsignedInteger('user_id')->nullable()->after('budget_id');
                $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
                $table->index('user_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('warehouse')) {
            Schema::table('warehouse', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            });
        }

        if (Schema::hasTable('transport')) {
            Schema::table('transport', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            });
        }

        if (Schema::hasTable('schedules')) {
            Schema::table('schedules', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            });
        }

        if (Schema::hasTable('budgets')) {
            Schema::table('budgets', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            });
        }
    }
};
