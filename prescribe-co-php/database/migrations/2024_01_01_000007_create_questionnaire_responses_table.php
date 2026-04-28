<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('questionnaire_responses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->index();
            $table->uuid('questionnaire_id')->index();
            $table->tinyInteger('questionnaire_version')->unsigned();
            $table->json('answers');
            $table->boolean('is_eligible')->nullable();
            $table->json('ineligibility_reasons')->nullable();
            $table->timestamp('submitted_at')->useCurrent()->index();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('questionnaire_id')->references('id')->on('questionnaires')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questionnaire_responses');
    }
};
