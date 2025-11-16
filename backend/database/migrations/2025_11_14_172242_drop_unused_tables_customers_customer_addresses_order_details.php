<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Drop unused tables that are no longer needed after system refactoring:
     * - customers: Customer info is stored directly in orders table
     * - customer_addresses: Receiver info is stored directly in orders table
     * - order_details: Not used in logistics system (no product catalog)
     */
    public function up(): void
    {
        // Disable foreign key checks to allow dropping tables
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // Drop tables
        Schema::dropIfExists('customer_addresses');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('order_details');

        // Re-enable foreign key checks
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate order_details table
        Schema::create('order_details', function (Blueprint $table) {
            $table->increments('order_details_id');
            $table->unsignedInteger('order_id');
            $table->unsignedInteger('organization_id');
            $table->integer('product_id');
            $table->integer('quantity');

            $table->index('order_id');
            $table->index('product_id');
            $table->index('organization_id');

            $table->foreign('order_id')->references('order_id')->on('orders')->onDelete('cascade')->onUpdate('cascade');
        });

        // Recreate customers table
        Schema::create('customers', function (Blueprint $table) {
            $table->increments('customer_id');
            $table->string('name', 255);
            $table->string('email', 255)->nullable();
            $table->string('phone', 50)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // Recreate customer_addresses table
        Schema::create('customer_addresses', function (Blueprint $table) {
            $table->increments('address_id');
            $table->unsignedInteger('customer_id');
            $table->string('address_type', 50)->default('delivery');
            $table->text('address_line1');
            $table->text('address_line2')->nullable();
            $table->string('city', 100);
            $table->string('state', 100)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('country', 100)->default('Philippines');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index('customer_id');
            $table->foreign('customer_id')->references('customer_id')->on('customers')->onDelete('cascade')->onUpdate('cascade');
        });
    }
};
