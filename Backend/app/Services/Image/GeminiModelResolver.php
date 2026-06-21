<?php

namespace App\Services\Image;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Makes image-model selection future-proof.
 *
 * Google requires an exact model name per request (no wildcard). Instead of
 * hard-coding one, we fetch the live model list from the user's key and resolve
 * the model to use in this order:
 *   1. the user's explicit choice (if still available)
 *   2. the env default (if available)
 *   3. auto-pick the newest available model for the capability
 * so newly released models work automatically and removed ones never 404.
 */
class GeminiModelResolver
{
    /**
     * @return array{predict: string[], generate: string[]}  image-capable model names
     */
    public function available(string $apiKey): array
    {
        return Cache::remember('gemini_models_'.md5($apiKey), now()->addMinutes(10), function () use ($apiKey) {
            $response = Http::timeout(30)->get(config('services.gemini.base_url').'/models', [
                'key' => $apiKey,
                'pageSize' => 1000,
            ]);

            if (! $response->successful()) {
                return ['predict' => [], 'generate' => []];
            }

            $predict = [];
            $generate = [];

            foreach (($response->json('models') ?? []) as $model) {
                $name = str_replace('models/', '', $model['name'] ?? '');
                $methods = $model['supportedGenerationMethods'] ?? [];

                $isImage = stripos($name, 'imagen') !== false || stripos($name, 'image') !== false;
                if (! $isImage) {
                    continue;
                }

                if (in_array('predict', $methods, true)) {
                    $predict[] = $name;
                }
                if (in_array('generateContent', $methods, true)) {
                    $generate[] = $name;
                }
            }

            return ['predict' => $predict, 'generate' => $generate];
        });
    }

    /**
     * @param  string  $capability  'predict' (Imagen) | 'generate' (Gemini Flash Image)
     */
    public function resolve(string $apiKey, string $capability, ?string $preferred, string $envConfigKey): string
    {
        $available = $this->available($apiKey);
        $list = $available[$capability] ?? [];

        if ($preferred && in_array($preferred, $list, true)) {
            return $preferred;
        }

        $envModel = config($envConfigKey);
        if ($envModel && in_array($envModel, $list, true)) {
            return $envModel;
        }

        $auto = $this->autoPick($list, $capability);
        if ($auto) {
            return $auto;
        }

        // Nothing matched (e.g. ListModels unavailable) — fall back to the env
        // default so the request can at least be attempted.
        if ($envModel) {
            return $envModel;
        }

        throw new RuntimeException('No suitable Gemini image model is available for your API key.');
    }

    /**
     * Newest stable model for the capability.
     */
    private function autoPick(array $list, string $capability): ?string
    {
        if (empty($list)) {
            return null;
        }

        // Prefer stable models over *-preview.
        $stable = array_values(array_filter($list, fn ($n) => stripos($n, 'preview') === false));
        $candidates = $stable ?: $list;

        if ($capability === 'predict') {
            // Prefer standard "generate" Imagen over fast/ultra variants.
            $pool = array_values(array_filter(
                $candidates,
                fn ($n) => stripos($n, 'imagen') !== false
                    && stripos($n, 'generate') !== false
                    && stripos($n, 'fast') === false
                    && stripos($n, 'ultra') === false,
            ));
            $pool = $pool
                ?: array_values(array_filter($candidates, fn ($n) => stripos($n, 'imagen') !== false))
                ?: $candidates;
        } else {
            $pool = array_values(array_filter(
                $candidates,
                fn ($n) => stripos($n, 'flash') !== false && stripos($n, 'image') !== false,
            ));
            $pool = $pool
                ?: array_values(array_filter($candidates, fn ($n) => stripos($n, 'image') !== false))
                ?: $candidates;
        }

        // Natural descending sort puts the highest version first
        // (e.g. imagen-4.0-… before imagen-3.0-…).
        rsort($pool, SORT_NATURAL | SORT_FLAG_CASE);

        return $pool[0] ?? null;
    }
}
