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
        Schema::table('shipments', function (Blueprint $table) {
            $table->unsignedInteger('budget_id')->nullable()->after('driver_id');
            $table->index('budget_id');
            $table->foreign('budget_id')->references('budget_id')->on('budgets')->onDelete('set null')->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropForeign(['budget_id']);
            $table->dropIndex(['budget_id']);
            $table->dropColumn('budget_id');
        });
    }
};
