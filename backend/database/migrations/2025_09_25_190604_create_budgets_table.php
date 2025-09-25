<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('budgets')) {
            Schema::create('budgets', function (Blueprint $table) {
                $table->increments('budget_id');
                $table->string('budget_name', 255);
                $table->date('start_date');
                $table->date('end_date');
                $table->integer('total_budget');

                $table->index('budget_name');
                $table->index('start_date');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};
