<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Refactor shipments table to be master/header record only.
     * Package-specific fields moved to package_details table.
     * Shipments now represents the overall shipment with master_tracking_number.
     */
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            // Remove fields that moved to package_details
            // These are now package-specific, not shipment-specific
            $table->dropColumn([
                'tracking_number',  // Moved to package_details (each package has unique tracking)
                'receiver_name',    // Moved to package_details (each package may have different receiver)
                'receiver_contact', // Moved to package_details
                'receiver_email',   // Moved to package_details
                'receiver_address', // Moved to package_details
                'charges',          // Moved to package_details (charges per package)
            ]);

            // Remove order_id foreign key constraint first, then the column
            $table->dropForeign(['order_id']);
            $table->dropIndex(['order_id']);
            $table->dropColumn('order_id'); // Shipment can contain multiple orders now

            // Make master_tracking_number required and unique
            // This becomes the main identifier for the shipment
            $table->string('master_tracking_number', 50)->nullable(false)->unique()->change();

            // Add warehouse_id for pickup location
            $table->unsignedInteger('warehouse_id')->nullable()->after('budget_id');
            $table->index('warehouse_id');
            $table->foreign('warehouse_id')
                  ->references('warehouse_id')
                  ->on('warehouse')
                  ->onDelete('set null')
                  ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            // Remove warehouse_id
            $table->dropForeign(['warehouse_id']);
            $table->dropIndex(['warehouse_id']);
            $table->dropColumn('warehouse_id');

            // Add back removed columns
            $table->string('tracking_number', 255)->nullable()->after('shipment_id');
            $table->string('receiver_name', 255)->nullable();
            $table->string('receiver_contact', 50)->nullable();
            $table->string('receiver_email', 255)->nullable();
            $table->text('receiver_address')->nullable();
            $table->integer('charges')->default(0);
            $table->unsignedInteger('order_id')->nullable();

            // Add back order_id foreign key
            $table->index('order_id');
            $table->foreign('order_id')
                  ->references('order_id')
                  ->on('orders')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');

            // Make master_tracking_number nullable again
            $table->string('master_tracking_number', 50)->nullable()->change();
        });
    }
};
