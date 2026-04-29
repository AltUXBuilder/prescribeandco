<?php

namespace App\Models;

use App\Enums\MedicineType;
use App\Enums\ProductStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    use HasUuids;

    protected $fillable = [
        'category_id',
        'questionnaire_id',
        'name',
        'slug',
        'description',
        'bnf_code',
        'medicine_type',
        'requires_prescription',
        'requires_questionnaire',
        'price_pence',
        's3_image_key',
        'status',
        'stock_count',
    ];

    // s3_image_key must never be in API responses
    protected $hidden = ['s3_image_key'];

    protected $casts = [
        'medicine_type'          => MedicineType::class,
        'status'                 => ProductStatus::class,
        'requires_prescription'  => 'boolean',
        'requires_questionnaire' => 'boolean',
    ];

    public function getFormattedPriceAttribute(): string
    {
        return '£' . number_format($this->price_pence / 100, 2);
    }

    public function getIsAvailableAttribute(): bool
    {
        return $this->status === ProductStatus::ACTIVE
            && ($this->stock_count === null || $this->stock_count > 0);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function questionnaire(): BelongsTo
    {
        return $this->belongsTo(Questionnaire::class);
    }
}
