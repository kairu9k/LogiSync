<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotes', function (Blueprint $table) {
            $table->increments('quote_id');
            $table->unsignedBigInteger('organization_id');
            $table->string('quote_number', 20)->unique()->nullable();
            $table->string('customer_name')->nullable();
            $table->unsignedInteger('created_by_user_id')->nullable();
            $table->timestamp('creation_date')->useCurrent();
            $table->integer('weight');
            $table->string('dimensions', 255);
            $table->integer('estimated_cost');
            $table->date('expiry_date');
            $table->string('status', 50)->default('pending');
            $table->integer('distance');

            $table->index('organization_id');
            $table->index('created_by_user_id');
            $table->index('status');
            $table->index('creation_date');

            $table->foreign('organization_id')->references('organization_id')->on('organizations')->onDelete('cascade');
            $table->foreign('created_by_user_id')->references('user_id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotes');
    }
};
