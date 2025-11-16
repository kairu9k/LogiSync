<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Remove customer_id and distance from quotes table.
     * - customer_id: Not used, customer info comes from orders.customer_name
     * - distance: Not actively used in the system
     */
    public function up(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            // Drop foreign key constraint first if it exists
            $table->dropForeign(['customer_id']);
        });

        // Check if columns exist before dropping
        if (Schema::hasColumn('quotes', 'customer_id')) {
            Schema::table('quotes', function (Blueprint $table) {
                $table->dropColumn('customer_id');
            });
        }

        if (Schema::hasColumn('quotes', 'distance')) {
            Schema::table('quotes', function (Blueprint $table) {
                $table->dropColumn('distance');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->unsignedInteger('customer_id')->nullable()->after('quote_id');
            $table->decimal('distance', 10, 2)->nullable()->after('dimensions');

            $table->index('customer_id');
        });
    }
};
