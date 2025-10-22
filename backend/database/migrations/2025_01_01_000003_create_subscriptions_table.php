<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->increments('subscription_id');
            $table->string('plan_name', 255);
            $table->string('slug')->nullable();
            $table->text('description')->nullable();
            $table->integer('price');
            $table->integer('term_months');
            $table->string('paymongo_payment_link_id')->nullable();
            $table->boolean('active')->default(true);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
