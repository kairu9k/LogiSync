<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates customer_addresses table to support multiple delivery addresses per customer
     * This is useful for customers who ship to different locations
     */
    public function up(): void
    {
        Schema::create('customer_addresses', function (Blueprint $table) {
            $table->increments('address_id');
            $table->unsignedInteger('customer_id');

            // Address Type
            $table->string('address_type', 50)->default('delivery'); // delivery, billing, pickup, etc.
            $table->string('address_label', 100)->nullable(); // e.g., "Main Office", "Warehouse 2"

            // Receiver Information
            $table->string('receiver_name', 255);
            $table->string('receiver_contact', 50);
            $table->string('receiver_email', 255)->nullable();

            // Address Details
            $table->text('address');
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('country', 100)->default('Philippines');

            // Geolocation (optional)
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();

            // Flags
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);

            // Additional info
            $table->text('delivery_instructions')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('customer_id');
            $table->index('address_type');
            $table->index('is_default');
            $table->index('is_active');

            // Foreign key
            $table->foreign('customer_id')
                  ->references('customer_id')
                  ->on('customers')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_addresses');
    }
};
