<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('prescription_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('customer_id')->index();
            $table->uuid('product_id')->index();
            $table->uuid('questionnaire_response_id')->nullable();
            $table->uuid('delivery_address_id')->nullable();
            $table->enum('status', [
                'DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED',
                'DISPENSING','FULFILLED','REJECTED','CANCELLED','EXPIRED',
            ])->default('DRAFT')->index();
            $table->enum('eligibility_status', ['PASS','FLAG','FAIL'])->nullable()->index();
            $table->json('eligibility_notes')->nullable();

            // Clinical (prescriber-populated)
            $table->uuid('prescriber_id')->nullable()->index();
            $table->uuid('dispenser_id')->nullable()->index();
            $table->date('prescribed_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->text('dosage_instructions')->nullable();
            $table->smallInteger('quantity_dispensed')->unsigned()->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('prescriber_note')->nullable();

            // Customer
            $table->text('customer_note')->nullable();

            // Lifecycle timestamps (de-normalised for SLA queries)
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('dispensing_started_at')->nullable();
            $table->timestamp('fulfilled_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            // Tracking
            $table->string('tracking_number', 100)->nullable();
            $table->string('courier_name', 100)->nullable();

            $table->timestamps();

            $table->foreign('customer_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescription_requests');
    }
};
