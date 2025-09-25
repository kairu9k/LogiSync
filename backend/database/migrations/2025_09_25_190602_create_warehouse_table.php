<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('warehouse')) {
            Schema::create('warehouse', function (Blueprint $table) {
                $table->increments('warehouse_id');
                $table->string('warehouse_name', 255);
                $table->text('location');
                $table->index('warehouse_name');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse');
    }
};
