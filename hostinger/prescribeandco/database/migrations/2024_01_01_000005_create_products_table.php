<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('category_id')->nullable()->index();
            $table->uuid('questionnaire_id')->nullable()->index();
            $table->string('name', 200);
            $table->string('slug', 220)->unique();
            $table->text('description')->nullable();
            $table->string('bnf_code', 20)->nullable();
            $table->enum('medicine_type', ['POM', 'P', 'GSL'])->default('GSL')->index();
            $table->boolean('requires_prescription')->default(false)->index();
            $table->boolean('requires_questionnaire')->default(false);
            $table->integer('price_pence')->unsigned();
            $table->string('s3_image_key', 500)->nullable();
            $table->enum('status', ['ACTIVE', 'INACTIVE', 'ARCHIVED'])->default('ACTIVE')->index();
            $table->integer('stock_count')->unsigned()->nullable();
            $table->timestamps();

            $table->foreign('category_id')->references('id')->on('categories')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
