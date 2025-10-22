<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->increments('user_id');
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->unsignedInteger('created_by')->nullable();
            $table->string('username', 255)->unique();
            $table->string('password', 255);
            $table->string('role', 50);
            $table->string('email', 255)->unique();
            $table->string('email_verification_code', 6)->nullable();
            $table->timestamp('email_verification_code_expires_at')->nullable();
            $table->boolean('email_verified')->default(false);

            $table->index('role');
            $table->index('organization_id');
            $table->index('created_by');

            $table->foreign('organization_id')->references('organization_id')->on('organizations')->onDelete('cascade');
            $table->foreign('created_by')->references('user_id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
