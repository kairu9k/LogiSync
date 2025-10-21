<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Step 1: Add organization_id column to users table
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable()->after('user_id');
            $table->foreign('organization_id')->references('organization_id')->on('organizations')->onDelete('cascade');
        });

        // Step 2: Create organizations from existing admin users (users without created_by)
        $adminUsers = DB::table('users')->whereNull('created_by')->get();

        foreach ($adminUsers as $admin) {
            // Create organization for each admin
            $organizationId = DB::table('organizations')->insertGetId([
                'name' => $admin->username . "'s Organization",
                'email' => $admin->email,
                'phone' => null,
                'address' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Update admin user with their organization_id
            DB::table('users')
                ->where('user_id', $admin->user_id)
                ->update(['organization_id' => $organizationId]);

            // Update all team members created by this admin
            DB::table('users')
                ->where('created_by', $admin->user_id)
                ->update(['organization_id' => $organizationId]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropColumn('organization_id');
        });
    }
};
