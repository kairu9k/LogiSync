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
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Free, Pro, Enterprise
            $table->string('slug')->unique(); // free, pro, enterprise
            $table->text('description')->nullable();
            $table->integer('price_cents')->default(0); // Price in centavos (₱99.00 = 9900)
            $table->string('billing_period')->default('monthly'); // monthly, yearly
            $table->json('features')->nullable(); // JSON array of features
            $table->integer('max_shipments')->nullable(); // null = unlimited
            $table->integer('max_users')->nullable(); // null = unlimited
            $table->boolean('gps_tracking')->default(false);
            $table->boolean('analytics')->default(false);
            $table->boolean('priority_support')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
