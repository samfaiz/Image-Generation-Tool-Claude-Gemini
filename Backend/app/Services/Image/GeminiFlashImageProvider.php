<?php

namespace App\Services\Image;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Gemini 2.5 Flash Image ("Nano Banana") via the `:generateContent` endpoint.
 *
 * Strengths: accepts a user-uploaded reference image for conditioning/editing.
 * Aspect ratio is requested via `generationConfig.imageConfig.aspectRatio` and
 * reinforced in the prompt, but is approximate (not strictly enforced like Imagen).
 * Used when the user uploaded a reference image.
 */
class GeminiFlashImageProvider implements ImageProviderInterface
{
    public function name(): string
    {
        return 'gemini-flash';
    }

    public function capability(): string
    {
        return 'generate';
    }

    public function envConfigKey(): string
    {
        return 'services.gemini.flash_image_model';
    }

    public function generate(
        string $apiKey,
        string $model,
        string $prompt,
        string $aspectRatio,
        ?string $referenceImageBase64 = null,
        ?string $referenceMime = null
    ): array {
        $url = config('services.gemini.base_url')."/models/{$model}:generateContent";

        $parts = [[
            'text' => $prompt."\n\nRender in a {$aspectRatio} vertical aspect ratio.",
        ]];

        if ($referenceImageBase64 !== null) {
            $parts[] = [
                'inlineData' => [
                    'mimeType' => $referenceMime ?: 'image/png',
                    'data' => $referenceImageBase64,
                ],
            ];
        }

        $response = Http::withHeaders(['content-type' => 'application/json'])
            ->timeout(180)
            ->post($url.'?key='.urlencode($apiKey), [
                'contents' => [
                    ['parts' => $parts],
                ],
                'generationConfig' => [
                    'responseModalities' => ['IMAGE'],
                    'imageConfig' => [
                        'aspectRatio' => $aspectRatio,
                    ],
                ],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException(
                'Gemini image request failed ('.$response->status().'): '.($response->json('error.message') ?? 'Unknown error')
            );
        }

        // Find the first inline image part in the first candidate.
        $partsOut = $response->json('candidates.0.content.parts') ?? [];
        foreach ($partsOut as $part) {
            if (isset($part['inlineData']['data'])) {
                return [
                    'data' => base64_decode($part['inlineData']['data']),
                    'mime' => $part['inlineData']['mimeType'] ?? 'image/png',
                ];
            }
        }

        throw new RuntimeException('Gemini returned no image data.');
    }
}
