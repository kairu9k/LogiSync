<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates customers table for centralized customer management
     * Eliminates customer data duplication across quotes and orders
     */
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->increments('customer_id');
            $table->unsignedBigInteger('organization_id');

            // Customer Information
            $table->string('customer_name', 255);
            $table->string('customer_email', 255)->nullable();
            $table->string('customer_phone', 50)->nullable();
            $table->string('company_name', 255)->nullable();

            // Default Receiver/Delivery Information
            $table->string('receiver_name', 255)->nullable();
            $table->string('receiver_contact', 50)->nullable();
            $table->text('receiver_address')->nullable();

            // Additional fields
            $table->text('notes')->nullable();
            $table->enum('customer_type', ['individual', 'business'])->default('individual');
            $table->boolean('is_active')->default(true);

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('organization_id');
            $table->index('customer_name');
            $table->index('customer_email');
            $table->index('is_active');

            // Foreign key
            $table->foreign('organization_id')
                  ->references('organization_id')
                  ->on('organizations')
                  ->onDelete('cascade');

            // Unique constraint - customer name per organization
            $table->unique(['customer_name', 'organization_id'], 'uk_customer_name_org');
        });

        // Migrate existing customer data from quotes
        DB::statement("
            INSERT INTO customers (organization_id, customer_name, created_at, updated_at)
            SELECT DISTINCT q.organization_id, q.customer_name, MIN(q.creation_date), NOW()
            FROM quotes q
            WHERE q.customer_name IS NOT NULL AND q.customer_name != ''
            GROUP BY q.organization_id, q.customer_name
        ");

        // Migrate existing customer data from orders that don't exist in quotes
        DB::statement("
            INSERT INTO customers (organization_id, customer_name, created_at, updated_at)
            SELECT DISTINCT o.organization_id, o.customer_name, MIN(o.order_date), NOW()
            FROM orders o
            WHERE o.customer_name IS NOT NULL
              AND o.customer_name != ''
              AND NOT EXISTS (
                  SELECT 1 FROM customers c
                  WHERE c.customer_name = o.customer_name
                    AND c.organization_id = o.organization_id
              )
            GROUP BY o.organization_id, o.customer_name
        ");

        // Add customer_id to quotes table
        Schema::table('quotes', function (Blueprint $table) {
            $table->unsignedInteger('customer_id')->nullable()->after('quote_id');
            $table->index('customer_id');
        });

        // Update quotes with customer_id
        DB::statement("
            UPDATE quotes q
            INNER JOIN customers c ON q.customer_name = c.customer_name
                AND q.organization_id = c.organization_id
            SET q.customer_id = c.customer_id
        ");

        // Add foreign key to quotes
        Schema::table('quotes', function (Blueprint $table) {
            $table->foreign('customer_id')
                  ->references('customer_id')
                  ->on('customers')
                  ->onDelete('set null');
        });

        // Add customer_id to orders table
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedInteger('customer_id')->nullable()->after('order_id');
            $table->index('customer_id');
        });

        // Update orders with customer_id
        DB::statement("
            UPDATE orders o
            INNER JOIN customers c ON o.customer_name = c.customer_name
                AND o.organization_id = c.organization_id
            SET o.customer_id = c.customer_id
        ");

        // Add foreign key to orders
        Schema::table('orders', function (Blueprint $table) {
            $table->foreign('customer_id')
                  ->references('customer_id')
                  ->on('customers')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove foreign keys and customer_id from orders
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropIndex(['customer_id']);
            $table->dropColumn('customer_id');
        });

        // Remove foreign keys and customer_id from quotes
        Schema::table('quotes', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropIndex(['customer_id']);
            $table->dropColumn('customer_id');
        });

        // Drop customers table
        Schema::dropIfExists('customers');
    }
};
