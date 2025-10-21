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
        // Add created_by to users table for team management
        if (!Schema::hasColumn('users', 'created_by')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unsignedInteger('created_by')->nullable()->after('user_id');
                $table->foreign('created_by')->references('user_id')->on('users')->onDelete('cascade');
                $table->index('created_by');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'created_by')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['created_by']);
                $table->dropColumn('created_by');
            });
        }
    }
};
