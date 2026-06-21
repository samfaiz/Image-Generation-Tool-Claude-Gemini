<?php

namespace App\Services\Image;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Google Imagen via the Gemini API `:predict` endpoint.
 *
 * Strengths: honors an explicit `aspectRatio` exactly (1:1, 3:4, 4:3, 9:16, 16:9).
 * Used when the user did NOT upload a reference image. Reference-image
 * conditioning is not supported here — that path uses GeminiFlashImageProvider.
 */
class ImagenProvider implements ImageProviderInterface
{
    public function name(): string
    {
        return 'imagen';
    }

    public function capability(): string
    {
        return 'predict';
    }

    public function envConfigKey(): string
    {
        return 'services.gemini.imagen_model';
    }

    public function generate(
        string $apiKey,
        string $model,
        string $prompt,
        string $aspectRatio,
        ?string $referenceImageBase64 = null,
        ?string $referenceMime = null
    ): array {
        $url = config('services.gemini.base_url')."/models/{$model}:predict";

        $response = Http::withHeaders(['content-type' => 'application/json'])
            ->timeout(180)
            ->post($url.'?key='.urlencode($apiKey), [
                'instances' => [
                    ['prompt' => $prompt],
                ],
                'parameters' => [
                    'sampleCount' => 1,
                    'aspectRatio' => $aspectRatio,
                ],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException(
                'Imagen request failed ('.$response->status().'): '.($response->json('error.message') ?? 'Unknown error')
            );
        }

        $prediction = $response->json('predictions.0');
        $b64 = $prediction['bytesBase64Encoded'] ?? null;

        if (! $b64) {
            throw new RuntimeException('Imagen returned no image data.');
        }

        return [
            'data' => base64_decode($b64),
            'mime' => $prediction['mimeType'] ?? 'image/png',
        ];
    }
}
