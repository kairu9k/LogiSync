<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_subscriptions', function (Blueprint $table) {
            $table->increments('user_subscription_id');
            $table->unsignedInteger('user_id');
            $table->unsignedInteger('subscription_id');
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status', 50)->default('active');

            $table->index('user_id');
            $table->index('subscription_id');
            $table->index('status');

            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade')->onUpdate('cascade');
            $table->foreign('subscription_id')->references('subscription_id')->on('subscriptions')->onDelete('cascade')->onUpdate('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_subscriptions');
    }
};
