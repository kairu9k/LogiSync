<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('quotes')) {
            Schema::create('quotes', function (Blueprint $table) {
                $table->increments('quote_id');
                $table->timestamp('creation_date')->useCurrent();
                $table->integer('user_id');
                $table->integer('weight');
                $table->string('dimensions', 255);
                $table->integer('estimated_cost');
                $table->date('expiry_date');
                $table->string('status', 50)->default('pending');
                $table->integer('distance');

                $table->index('user_id');
                $table->index('status');
                $table->index('creation_date');

                $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade')->onUpdate('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('quotes');
    }
};
