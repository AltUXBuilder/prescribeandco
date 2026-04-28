<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('prescription_request_id')->index();
            $table->enum('payment_method', ['CARD','NHS_VOUCHER','EXEMPT']);
            $table->enum('status', [
                'PENDING','AUTHORISED','CAPTURED','FAILED',
                'REFUNDED','PARTIALLY_REFUNDED','VOIDED',
            ])->default('PENDING')->index();
            $table->integer('amount_pence')->unsigned();
            $table->char('currency', 3)->default('GBP');
            $table->integer('refunded_amount_pence')->unsigned()->default(0);
            $table->string('payment_method_token', 255)->nullable();
            $table->uuid('idempotency_key')->unique();
            $table->string('provider_payment_id', 255)->nullable();
            $table->string('provider_charge_id', 255)->nullable();
            $table->string('provider_refund_id', 255)->nullable();
            $table->string('failure_code', 100)->nullable();
            $table->string('failure_message', 500)->nullable();
            $table->timestamp('authorized_at')->nullable();
            $table->timestamp('captured_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->json('raw_provider_response')->nullable();
            $table->string('last_webhook_event_id', 255)->nullable();
            $table->timestamps();

            $table->foreign('prescription_request_id')
                ->references('id')->on('prescription_requests')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
