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

        [$refB64, $refMime] = $this->referenceImage($generation);

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
                referenceImageBase64: $refB64,
                referenceMime: $refMime,
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
     * Phase 2 — Gemini/Imagen renders the image from the final prompt.
     */
    public function generateImage(Generation $generation, ApiCredential $credential): Generation
    {
        if (! $credential->hasGeminiKey()) {
            throw new RuntimeException('No Gemini API key on file. Add one in Settings.');
        }
        if (empty($generation->final_prompt)) {
            throw new RuntimeException('Run the prompt-engineering step first.');
        }

        $generation->forceFill(['status' => Generation::STATUS_GENERATING])->save();

        [$refB64, $refMime] = $this->referenceImage($generation);
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

            $result = $provider->generate(
                apiKey: $credential->gemini_key,
                model: $model,
                prompt: $generation->final_prompt,
                aspectRatio: $generation->aspect_ratio,
                referenceImageBase64: $refB64,
                referenceMime: $refMime,
            );
        } catch (Throwable $e) {
            $this->fail($generation, $e->getMessage());
            throw $e;
        }

        $ext = str_contains($result['mime'], 'jpeg') ? 'jpg' : 'png';
        $path = "generations/{$generation->id}.{$ext}";
        Storage::disk('public')->put($path, $result['data']);

        $generation->forceFill([
            'image_path' => $path,
            'provider' => $provider->name(),
            'status' => Generation::STATUS_COMPLETED,
            'error' => null,
        ])->save();

        return $generation;
    }

    /**
     * @return array{0:?string,1:?string} [base64, mime]
     */
    private function referenceImage(Generation $generation): array
    {
        if (! $generation->reference_path || ! Storage::disk('public')->exists($generation->reference_path)) {
            return [null, null];
        }

        $bytes = Storage::disk('public')->get($generation->reference_path);
        $mime = Storage::disk('public')->mimeType($generation->reference_path) ?: 'image/png';

        // Only feed actual images to the vision/conditioning paths.
        if (! str_starts_with($mime, 'image/')) {
            return [null, null];
        }

        return [base64_encode($bytes), $mime];
    }

    private function fail(Generation $generation, string $message): void
    {
        $generation->forceFill([
            'status' => Generation::STATUS_FAILED,
            'error' => $message,
        ])->save();
    }
}
