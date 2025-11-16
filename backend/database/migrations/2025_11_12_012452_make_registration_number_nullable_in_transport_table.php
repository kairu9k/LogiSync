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
        Schema::table('transport', function (Blueprint $table) {
            // Make registration_number nullable (optional field)
            $table->string('registration_number', 255)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transport', function (Blueprint $table) {
            // Revert to NOT NULL
            $table->string('registration_number', 255)->nullable(false)->change();
        });
    }
};
