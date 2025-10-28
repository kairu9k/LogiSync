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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id('notification_id');
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('user_id')->nullable(); // Optional: specific user, or null for all org users
            $table->string('type', 50); // 'critical', 'warning', 'info', 'success'
            $table->string('category', 50); // 'shipment', 'invoice', 'quote', 'warehouse', 'order'
            $table->string('icon', 10); // Emoji icon
            $table->text('message');
            $table->string('link')->nullable(); // URL to navigate to
            $table->string('priority', 20)->default('medium'); // 'high', 'medium', 'low'
            $table->unsignedBigInteger('related_id')->nullable(); // ID of related entity (shipment_id, invoice_id, etc.)
            $table->boolean('read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index('organization_id');
            $table->index('user_id');
            $table->index(['organization_id', 'read']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
