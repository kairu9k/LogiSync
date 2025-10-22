<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->increments('budget_id');
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->string('budget_name', 255);
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('total_budget');

            $table->index('budget_name');
            $table->index('start_date');
            $table->index('organization_id');

            $table->foreign('organization_id')->references('organization_id')->on('organizations')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};
