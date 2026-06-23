<?php

namespace App\Services\Image;

/**
 * Gemini family = the "artist". Swappable image backends behind one contract.
 */
interface ImageProviderInterface
{
    /**
     * Generate one or more image variations from a natural-language prompt.
     *
     * @param  string       $apiKey               The user's Gemini API key (decrypted in-memory).
     * @param  string       $model                Exact model name (resolved at runtime).
     * @param  string       $prompt               Synthesized natural-language prompt.
     * @param  string       $aspectRatio          e.g. "9:16", "1:1", "16:9".
     * @param  int          $variations           How many distinct images to produce (>= 1).
     * @param  string|null  $referenceImageBase64 Optional reference image for conditioning.
     * @param  string|null  $referenceMime        MIME of the reference image.
     * @return array<int, array{data:string,mime:string}>  One entry per variation.
     */
    public function generate(
        string $apiKey,
        string $model,
        string $prompt,
        string $aspectRatio,
        int $variations = 1,
        ?string $referenceImageBase64 = null,
        ?string $referenceMime = null
    ): array;

    /** Capability used to resolve a model: 'predict' (Imagen) | 'generate' (Flash). */
    public function capability(): string;

    /** Config key holding the env-default model for this provider. */
    public function envConfigKey(): string;

    /** Short identifier persisted on the generation (e.g. "imagen"). */
    public function name(): string;
}
