<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('prescriber_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->unique();
            $table->char('gphc_number', 7)->unique();
            $table->boolean('gphc_verified')->default(false);
            $table->timestamp('gphc_verified_at')->nullable();
            $table->string('specialisation', 200)->nullable();
            $table->string('organisation', 200)->nullable();
            $table->string('indemnity_ref', 100)->nullable();
            $table->date('indemnity_expiry')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescriber_profiles');
    }
};
