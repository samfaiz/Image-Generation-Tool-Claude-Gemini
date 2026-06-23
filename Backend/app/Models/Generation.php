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
        'reference_paths',
        'claude_json',
        'market_read',
        'final_prompt',
        'aspect_ratio',
        'provider',
        'image_path',
        'image_paths',
        'status',
        'error',
    ];

    protected function casts(): array
    {
        return [
            'claude_json' => 'array',
            'market_read' => 'array',
            'reference_paths' => 'array',
            'image_paths' => 'array',
        ];
    }

    protected $appends = ['has_reference', 'image_url', 'image_urls', 'reference_count'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** All stored reference paths (new array column) — falls back to the legacy single column. */
    public function allReferencePaths(): array
    {
        $paths = $this->reference_paths ?? [];
        if (! is_array($paths)) {
            $paths = [];
        }
        if (empty($paths) && ! empty($this->reference_path)) {
            $paths = [$this->reference_path];
        }

        return array_values(array_filter($paths));
    }

    public function getHasReferenceAttribute(): bool
    {
        return count($this->allReferencePaths()) > 0;
    }

    public function getReferenceCountAttribute(): int
    {
        return count($this->allReferencePaths());
    }

    /** All generated image paths — falls back to the legacy single column. */
    public function allImagePaths(): array
    {
        $paths = $this->image_paths ?? [];
        if (! is_array($paths)) {
            $paths = [];
        }
        if (empty($paths) && ! empty($this->image_path)) {
            $paths = [$this->image_path];
        }

        return array_values(array_filter($paths));
    }

    /**
     * Canvas-safe URL for the primary image (variant index 0). Same-origin
     * proxy with CORS so the watermark canvas can export untainted.
     */
    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path
            ? route('api.generations.image', $this->id)
            : null;
    }

    /** Canvas-safe URLs for every generated variation. */
    public function getImageUrlsAttribute(): array
    {
        $urls = [];
        foreach (array_keys($this->allImagePaths()) as $i) {
            $urls[] = route('api.generations.image', ['generation' => $this->id, 'v' => $i]);
        }

        return $urls;
    }
}
