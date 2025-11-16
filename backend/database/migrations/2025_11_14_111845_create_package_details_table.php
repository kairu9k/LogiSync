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
     * Creates shipment_details table for individual packages within a shipment.
     * Supports multiple packages per shipment (1 shipment = many packages).
     */
    public function up(): void
    {
        Schema::create('shipment_details', function (Blueprint $table) {
            $table->increments('detail_id');
            $table->unsignedInteger('shipment_id');
            $table->unsignedInteger('order_id')->nullable();

            // Package-specific information
            $table->string('tracking_number', 255)->unique();
            $table->string('receiver_name', 255);
            $table->string('receiver_contact', 50)->nullable();
            $table->string('receiver_email', 255)->nullable();
            $table->text('receiver_address');

            // Package dimensions and weight
            $table->decimal('weight', 10, 2)->nullable()->comment('Weight in kg');
            $table->decimal('length', 10, 2)->nullable()->comment('Length in cm');
            $table->decimal('width', 10, 2)->nullable()->comment('Width in cm');
            $table->decimal('height', 10, 2)->nullable()->comment('Height in cm');

            // Package charges
            $table->integer('charges')->default(0);

            // Package status (can be different from overall shipment status)
            $table->string('status', 50)->default('pending');

            // Package notes
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('shipment_id');
            $table->index('order_id');
            $table->index('tracking_number');
            $table->index('status');

            // Foreign keys
            $table->foreign('shipment_id')
                  ->references('shipment_id')
                  ->on('shipments')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');

            $table->foreign('order_id')
                  ->references('order_id')
                  ->on('orders')
                  ->onDelete('set null')
                  ->onUpdate('cascade');
        });

        // Migrate existing shipments data to shipment_details
        // Each existing shipment becomes 1 package in the new structure
        DB::statement("
            INSERT INTO shipment_details (
                shipment_id, order_id, tracking_number,
                receiver_name, receiver_contact, receiver_email, receiver_address,
                charges, status, created_at, updated_at
            )
            SELECT
                shipment_id, order_id, tracking_number,
                receiver_name, receiver_contact, receiver_email, receiver_address,
                charges, status, creation_date, NOW()
            FROM shipments
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipment_details');
    }
};
