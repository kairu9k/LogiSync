<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('orders', 'quote_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->integer('quote_id')->nullable()->after('user_id');
                $table->index('quote_id');
            });
            // Add FK separately to avoid errors if quotes table doesn't exist yet
            Schema::table('orders', function (Blueprint $table) {
                $table->foreign('quote_id')->references('quote_id')->on('quotes')->onDelete('set null')->onUpdate('cascade');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('orders', 'quote_id')) {
            Schema::table('orders', function (Blueprint $table) {
                // Drop FK if exists
                try { $table->dropForeign(['quote_id']); } catch (\Throwable $e) {}
                $table->dropIndex(['quote_id']);
                $table->dropColumn('quote_id');
            });
        }
    }
};