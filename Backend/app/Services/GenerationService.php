<?php

namespace App\Services;

use App\Models\ApiCredential;
use App\Models\Generation;
use App\Services\Image\GeminiModelResolver;
use App\Services\Image\ImageProviderFactory;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

/**
 * Orchestrates the two-phase dual-AI pipeline. Phase 1 (Claude) and phase 2
 * (Gemini) are exposed separately so the frontend can render two distinct
 * loading skeletons ("Engineering prompt…" then "Generating image…").
 */
class GenerationService
{
    public function __construct(
        private AnthropicService $claude,
        private ImageProviderFactory $imageFactory,
        private GeminiModelResolver $modelResolver,
    ) {}

    /**
     * Phase 1 — Claude turns the brief into structured JSON + a final prompt.
     */
    public function engineerPrompt(Generation $generation, ApiCredential $credential): Generation
    {
        if (! $credential->hasClaudeKey()) {
            throw new RuntimeException('No Claude API key on file. Add one in Settings.');
        }

        $references = $this->referenceImages($generation);

        try {
            $json = $this->claude->engineerPrompt(
                apiKey: $credential->claude_key,
                inputs: [
                    'idea' => $generation->idea,
                    'industry' => $generation->industry,
                    'competitors' => $generation->competitors,
                    'elements' => $generation->elements,
                    'reference_url' => $generation->reference_url,
                    'aspect_ratio' => $generation->aspect_ratio,
                ],
                referenceImages: $references,
                marketRead: is_array($generation->market_read) ? $generation->market_read : null,
            );
        } catch (Throwable $e) {
            $this->fail($generation, $e->getMessage());
            throw $e;
        }

        $generation->forceFill([
            'claude_json' => $json,
            'final_prompt' => $json['final_prompt'],
            'status' => Generation::STATUS_PROMPTED,
            'error' => null,
        ])->save();

        return $generation;
    }

    /**
     * Phase 2 — Gemini/Imagen renders 1..N variations from the final prompt.
     */
    public function generateImage(Generation $generation, ApiCredential $credential, int $variations = 1): Generation
    {
        if (! $credential->hasGeminiKey()) {
            throw new RuntimeException('No Gemini API key on file. Add one in Settings.');
        }
        if (empty($generation->final_prompt)) {
            throw new RuntimeException('Run the prompt-engineering step first.');
        }

        $variations = max(1, min(4, $variations));

        // Clean up any earlier outputs on this row (re-runs from "retry").
        foreach ($generation->allImagePaths() as $old) {
            if ($old && Storage::disk('public')->exists($old)) {
                Storage::disk('public')->delete($old);
            }
        }

        $generation->forceFill(['status' => Generation::STATUS_GENERATING])->save();

        // Gemini conditioning takes a single image — use the first reference only.
        [$refB64, $refMime] = $this->referenceImages($generation)[0] ?? [null, null];
        $provider = $this->imageFactory->for($generation);

        $preferred = $provider->capability() === 'predict'
            ? $credential->imagen_model
            : $credential->flash_model;

        try {
            // Resolve the exact model now (user choice → env default → newest available).
            $model = $this->modelResolver->resolve(
                $credential->gemini_key,
                $provider->capability(),
                $preferred,
                $provider->envConfigKey(),
            );

            $results = $provider->generate(
                apiKey: $credential->gemini_key,
                model: $model,
                prompt: $generation->final_prompt,
                aspectRatio: $generation->aspect_ratio,
                variations: $variations,
                referenceImageBase64: $refB64,
                referenceMime: $refMime,
            );
        } catch (Throwable $e) {
            $this->fail($generation, $e->getMessage());
            throw $e;
        }

        $paths = [];
        foreach ($results as $i => $result) {
            $ext = str_contains($result['mime'], 'jpeg') ? 'jpg' : 'png';
            $suffix = $i === 0 ? '' : '-'.$i;
            $path = "generations/{$generation->id}{$suffix}.{$ext}";
            Storage::disk('public')->put($path, $result['data']);
            $paths[] = $path;
        }

        $generation->forceFill([
            'image_path' => $paths[0] ?? null,
            'image_paths' => $paths,
            'provider' => $provider->name(),
            'status' => Generation::STATUS_COMPLETED,
            'error' => null,
        ])->save();

        return $generation;
    }

    /**
     * Decode every stored reference image for vision/conditioning use.
     * Non-image references (e.g. .mp4) are skipped.
     *
     * @return array<int, array{0:string,1:string}>  list of [base64, mime] pairs
     */
    private function referenceImages(Generation $generation): array
    {
        $out = [];
        foreach ($generation->allReferencePaths() as $path) {
            if (! Storage::disk('public')->exists($path)) {
                continue;
            }
            $mime = Storage::disk('public')->mimeType($path) ?: 'image/png';
            if (! str_starts_with($mime, 'image/')) {
                continue;
            }
            $out[] = [base64_encode(Storage::disk('public')->get($path)), $mime];
        }

        return $out;
    }

    private function fail(Generation $generation, string $message): void
    {
        $generation->forceFill([
            'status' => Generation::STATUS_FAILED,
            'error' => $message,
        ])->save();
    }
}
