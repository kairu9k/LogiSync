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
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('plan_name');
            $table->string('paymongo_payment_link_id')->nullable()->after('term_months');
            $table->boolean('active')->default(true)->after('paymongo_payment_link_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['slug', 'paymongo_payment_link_id', 'active']);
        });
    }
};
