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
        Schema::table('inventory', function (Blueprint $table) {
            // Drop the old foreign key and column
            $table->dropForeign(['order_details_id']);
            $table->dropColumn('order_details_id');

            // Add new order_id column
            $table->unsignedInteger('order_id')->after('location_in_warehouse');
            $table->index('order_id');
            $table->foreign('order_id')->references('order_id')->on('orders')->onDelete('cascade')->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
            // Reverse the changes
            $table->dropForeign(['order_id']);
            $table->dropColumn('order_id');

            // Restore old structure
            $table->unsignedInteger('order_details_id')->after('location_in_warehouse');
            $table->index('order_details_id');
            $table->foreign('order_details_id')->references('order_details_id')->on('order_details')->onDelete('cascade')->onUpdate('cascade');
        });
    }
};
