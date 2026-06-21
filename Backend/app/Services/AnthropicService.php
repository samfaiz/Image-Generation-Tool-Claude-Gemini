<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Claude = the "prompt engineer".
 *
 * Takes the user's raw ideation inputs (and an optional reference image) and
 * returns a structured JSON prompt PLUS a synthesized natural-language
 * `final_prompt` that the image model will actually consume. We use Claude's
 * structured-outputs (`output_config.format`) to guarantee schema-valid JSON.
 *
 * Per the Claude API guidance: model defaults to claude-opus-4-8, headers are
 * x-api-key + anthropic-version, and we must NOT send temperature/top_p (those
 * 400 on Opus 4.8).
 */
class AnthropicService
{
    /**
     * JSON schema Claude is constrained to. Kept within the structured-output
     * supported subset (types, arrays of strings, enum — no min/max/length).
     */
    private function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'subject' => ['type' => 'string'],
                'style' => ['type' => 'string'],
                'composition' => ['type' => 'string'],
                'color_palette' => ['type' => 'array', 'items' => ['type' => 'string']],
                'lighting' => ['type' => 'string'],
                'mood' => ['type' => 'string'],
                'differentiators_vs_competitors' => ['type' => 'array', 'items' => ['type' => 'string']],
                'must_include_elements' => ['type' => 'array', 'items' => ['type' => 'string']],
                'negative_prompt' => ['type' => 'string'],
                'aspect_ratio' => ['type' => 'string'],
                'final_prompt' => ['type' => 'string'],
            ],
            'required' => [
                'subject', 'style', 'composition', 'color_palette', 'lighting',
                'mood', 'differentiators_vs_competitors', 'must_include_elements',
                'negative_prompt', 'aspect_ratio', 'final_prompt',
            ],
        ];
    }

    private function systemPrompt(): string
    {
        return <<<'SYS'
        You are an expert visual prompt engineer for a professional AI image-generation tool.
        You receive a marketing/creative brief and must convert it into a precise, production-ready
        image specification.

        Your job:
        - Analyze the idea, the field/industry, and the named competitors. Design an image concept that
          is distinctive and clearly differentiated from those competitors (avoid their visual cliches).
        - Honor any explicitly requested elements and reference material.
        - Produce a single, vivid, self-contained `final_prompt`: one rich natural-language paragraph
          that an image model can consume directly. It must describe subject, setting, style, composition,
          color, lighting, and mood concretely (no meta commentary, no lists, no "create an image of").
        - Respect the requested aspect ratio.
        - Keep it brand-safe and free of real logos/trademarked text unless explicitly requested.

        Return ONLY the structured JSON object matching the provided schema.
        SYS;
    }

    private function userPrompt(array $inputs): string
    {
        $lines = [
            'IDEA: '.$inputs['idea'],
            'FIELD / INDUSTRY: '.$inputs['industry'],
            'COMPETITORS (differentiate from these): '.$inputs['competitors'],
        ];
        if (! empty($inputs['elements'])) {
            $lines[] = 'ELEMENTS TO INCLUDE: '.$inputs['elements'];
        }
        if (! empty($inputs['reference_url'])) {
            $lines[] = 'REFERENCE URL: '.$inputs['reference_url'];
        }
        $lines[] = 'TARGET ASPECT RATIO: '.$inputs['aspect_ratio'];
        if (! empty($inputs['has_reference_image'])) {
            $lines[] = 'A reference image is attached — use it for visual direction.';
        }

        return implode("\n", $lines);
    }

    /**
     * @param  array{idea:string,industry:string,competitors:string,elements?:string,reference_url?:string,aspect_ratio:string}  $inputs
     * @return array  decoded JSON object including `final_prompt`
     */
    public function engineerPrompt(
        string $apiKey,
        array $inputs,
        ?string $referenceImageBase64 = null,
        ?string $referenceMime = null
    ): array {
        $inputs['has_reference_image'] = $referenceImageBase64 !== null;

        $content = [];
        if ($referenceImageBase64 !== null) {
            $content[] = [
                'type' => 'image',
                'source' => [
                    'type' => 'base64',
                    'media_type' => $referenceMime ?: 'image/png',
                    'data' => $referenceImageBase64,
                ],
            ];
        }
        $content[] = ['type' => 'text', 'text' => $this->userPrompt($inputs)];

        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => config('services.anthropic.version'),
            'content-type' => 'application/json',
        ])->timeout(120)->post(config('services.anthropic.base_url').'/v1/messages', [
            'model' => config('services.anthropic.model'),
            'max_tokens' => 4096,
            'system' => $this->systemPrompt(),
            'messages' => [
                ['role' => 'user', 'content' => $content],
            ],
            'output_config' => [
                'format' => [
                    'type' => 'json_schema',
                    'schema' => $this->schema(),
                ],
            ],
        ]);

        if (! $response->successful()) {
            throw new RuntimeException(
                'Claude request failed ('.$response->status().'): '.$this->errorMessage($response->json())
            );
        }

        $body = $response->json();

        if (($body['stop_reason'] ?? null) === 'refusal') {
            throw new RuntimeException('Claude declined this request. Please adjust your inputs.');
        }

        $text = collect($body['content'] ?? [])
            ->firstWhere('type', 'text')['text'] ?? null;

        $data = $text ? json_decode($text, true) : null;

        if (! is_array($data) || empty($data['final_prompt'])) {
            throw new RuntimeException('Claude returned an unexpected response shape.');
        }

        return $data;
    }

    /**
     * Lightweight liveness check used when the user saves their key.
     */
    public function verifyKey(string $apiKey): bool
    {
        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => config('services.anthropic.version'),
            'content-type' => 'application/json',
        ])->timeout(30)->post(config('services.anthropic.base_url').'/v1/messages', [
            'model' => config('services.anthropic.model'),
            'max_tokens' => 1,
            'messages' => [['role' => 'user', 'content' => 'ping']],
        ]);

        // A 200 (or even a 200 with stop_reason max_tokens) means the key is valid.
        // 401/403 => invalid key/permissions.
        return $response->successful();
    }

    private function errorMessage(?array $body): string
    {
        return $body['error']['message'] ?? 'Unknown error';
    }
}
