<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuestionnaireResponse extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'questionnaire_id',
        'questionnaire_version',
        'answers',
        'is_eligible',
        'ineligibility_reasons',
        'submitted_at',
    ];

    protected $casts = [
        'answers'               => 'array',
        'ineligibility_reasons' => 'array',
        'is_eligible'           => 'boolean',
        'submitted_at'          => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function questionnaire(): BelongsTo
    {
        return $this->belongsTo(Questionnaire::class);
    }
}
