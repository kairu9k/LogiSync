<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouse', function (Blueprint $table) {
            $table->increments('warehouse_id');
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->string('warehouse_name', 255);
            $table->text('location');

            $table->index('warehouse_name');
            $table->index('organization_id');

            $table->foreign('organization_id')->references('organization_id')->on('organizations')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse');
    }
};
