<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

/**
 * Encrypted vault for a user's Claude + Gemini API keys.
 *
 * Keys are encrypted at rest with AES-256-CBC via Laravel's Crypt facade
 * (the cipher is configured in config/app.php as AES-256-CBC and the key is
 * derived from APP_KEY). The mutators below transparently encrypt on write;
 * the accessors decrypt on read. Only `*_last4` is ever exposed to clients.
 */
class ApiCredential extends Model
{
    protected $fillable = [
        'user_id',
        'claude_key',
        'gemini_key',
        'claude_last4',
        'gemini_last4',
        'claude_verified_at',
        'gemini_verified_at',
        'imagen_model',
        'flash_model',
    ];

    protected $hidden = [
        'claude_key',
        'gemini_key',
    ];

    protected function casts(): array
    {
        return [
            'claude_verified_at' => 'datetime',
            'gemini_verified_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // --- Claude key (AES-256-CBC at rest) ---------------------------------

    public function setClaudeKeyAttribute(?string $value): void
    {
        $this->attributes['claude_key'] = $value === null || $value === ''
            ? null
            : Crypt::encryptString($value);
        $this->attributes['claude_last4'] = $value ? substr($value, -4) : null;
    }

    public function getClaudeKeyAttribute(?string $value): ?string
    {
        return $value === null ? null : Crypt::decryptString($value);
    }

    // --- Gemini key (AES-256-CBC at rest) ---------------------------------

    public function setGeminiKeyAttribute(?string $value): void
    {
        $this->attributes['gemini_key'] = $value === null || $value === ''
            ? null
            : Crypt::encryptString($value);
        $this->attributes['gemini_last4'] = $value ? substr($value, -4) : null;
    }

    public function getGeminiKeyAttribute(?string $value): ?string
    {
        return $value === null ? null : Crypt::decryptString($value);
    }

    public function hasClaudeKey(): bool
    {
        return ! empty($this->attributes['claude_key']);
    }

    public function hasGeminiKey(): bool
    {
        return ! empty($this->attributes['gemini_key']);
    }
}
