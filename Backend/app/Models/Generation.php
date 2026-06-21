<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Generation extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_PROMPTED = 'prompted';
    public const STATUS_GENERATING = 'generating';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'user_id',
        'idea',
        'industry',
        'competitors',
        'elements',
        'reference_url',
        'reference_path',
        'claude_json',
        'final_prompt',
        'aspect_ratio',
        'provider',
        'image_path',
        'status',
        'error',
    ];

    protected function casts(): array
    {
        return [
            'claude_json' => 'array',
        ];
    }

    protected $appends = ['has_reference', 'image_url'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getHasReferenceAttribute(): bool
    {
        return ! empty($this->reference_path);
    }

    /**
     * Canvas-safe URL served through the backend (same-origin proxy with CORS).
     */
    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path
            ? route('api.generations.image', $this->id)
            : null;
    }
}
