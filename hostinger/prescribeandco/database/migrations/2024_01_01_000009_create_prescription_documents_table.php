<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('prescription_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('prescription_request_id')->index();
            $table->uuid('uploader_id')->index();
            $table->enum('document_type', ['ID_PROOF','NHS_EXEMPTION','PRESCRIPTION_SCAN','OTHER']);
            $table->string('s3_key', 500);
            $table->string('original_filename', 255);
            $table->string('mime_type', 100);
            $table->integer('file_size_bytes')->unsigned();
            $table->enum('scan_status', ['PENDING','CLEAN','INFECTED'])->default('PENDING')->index();
            $table->timestamp('scan_completed_at')->nullable();
            $table->timestamp('uploaded_at')->useCurrent();

            $table->foreign('prescription_request_id')
                ->references('id')->on('prescription_requests')->onDelete('cascade');
            $table->foreign('uploader_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescription_documents');
    }
};
