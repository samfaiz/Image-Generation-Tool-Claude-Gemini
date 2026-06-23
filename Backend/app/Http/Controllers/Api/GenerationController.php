<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Generation;
use App\Services\AnthropicService;
use App\Services\GenerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class GenerationController extends Controller
{
    private const ASPECT_RATIOS = ['9:16', '16:9', '1:1', '3:4', '4:3'];

    public const MAX_REFERENCES = 4;

    public const MAX_VARIATIONS = 4;

    public const DEFAULT_VARIATIONS = 3;

    public function index(Request $request): JsonResponse
    {
        $generations = $request->user()
            ->generations()
            ->latest()
            ->paginate(12);

        return response()->json($generations);
    }

    public function show(Request $request, Generation $generation): JsonResponse
    {
        $this->authorizeOwner($request, $generation);

        return response()->json($generation);
    }

    /**
     * Stateless: when the user doesn't know what to create, ask Claude (with web_search)
     * to research the company and return 4 diverse ready-to-run creative concepts.
     */
    public function inspire(Request $request, AnthropicService $claude): JsonResponse
    {
        // Web-search + 4-suggestion composition can easily exceed PHP's default 30s cap.
        set_time_limit(240);

        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:120'],
            'what_company_does' => ['required', 'string', 'max:1000'],
            'industry' => ['nullable', 'string', 'max:255'],
        ]);

        $credential = $request->user()->credential;
        if (! $credential || ! $credential->hasClaudeKey()) {
            return response()->json(['message' => 'Add your Claude API key before requesting inspiration.'], 422);
        }

        try {
            $suggestions = $claude->suggestConcepts($credential->claude_key, $data);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        return response()->json(['suggestions' => $suggestions]);
    }

    /**
     * Stateless: Claude + web_search produces a market read for the brief.
     * Returns a structured JSON we then feed into the prompt-engineering call.
     */
    public function market(Request $request, AnthropicService $claude): JsonResponse
    {
        // Web-search can exceed PHP's default 30s cap.
        set_time_limit(180);

        $data = $request->validate([
            'idea' => ['required', 'string', 'max:5000'],
            'industry' => ['required', 'string', 'max:255'],
            'competitors' => ['required', 'string', 'max:1000'],
            'template' => ['nullable', 'string', 'max:100'],
            'style_tags' => ['nullable', 'array'],
            'style_tags.*' => ['string', 'max:50'],
            'mood_tags' => ['nullable', 'array'],
            'mood_tags.*' => ['string', 'max:50'],
        ]);

        $credential = $request->user()->credential;
        if (! $credential || ! $credential->hasClaudeKey()) {
            return response()->json(['message' => 'Add your Claude API key before researching the market.'], 422);
        }

        try {
            $marketRead = $claude->marketResearch($credential->claude_key, $data);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        return response()->json(['market_read' => $marketRead]);
    }

    /**
     * Stateless: ask Claude for 2–3 multi-choice clarifying questions tailored
     * to the user's rough brief. Does NOT create a Generation row.
     */
    public function clarify(Request $request, AnthropicService $claude): JsonResponse
    {
        $data = $request->validate([
            'idea' => ['required', 'string', 'max:5000'],
            'industry' => ['nullable', 'string', 'max:255'],
            'competitors' => ['nullable', 'string', 'max:1000'],
            'template' => ['nullable', 'string', 'max:100'],
            'style_tags' => ['nullable', 'array'],
            'style_tags.*' => ['string', 'max:50'],
            'mood_tags' => ['nullable', 'array'],
            'mood_tags.*' => ['string', 'max:50'],
        ]);

        $credential = $request->user()->credential;
        if (! $credential || ! $credential->hasClaudeKey()) {
            return response()->json(['message' => 'Add your Claude API key before refining the brief.'], 422);
        }

        try {
            $questions = $claude->clarifyBrief($credential->claude_key, $data);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        return response()->json(['questions' => $questions]);
    }

    /**
     * Phase 1 — accept the ideation form, store any reference file, run Claude.
     */
    public function store(Request $request, GenerationService $service): JsonResponse
    {
        // Claude prompt engineering with vision + market read can exceed 30s.
        set_time_limit(180);

        $data = $request->validate([
            'idea' => ['required', 'string', 'max:5000'],
            'industry' => ['required', 'string', 'max:255'],
            'competitors' => ['required', 'string', 'max:1000'],
            'elements' => ['nullable', 'string', 'max:2000'],
            'reference_url' => ['nullable', 'url', 'max:2000'],
            // Legacy single-file field — still accepted for backward compat.
            'reference' => ['nullable', 'file', 'mimetypes:image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime', 'max:20480'],
            // New multi-file field — up to MAX_REFERENCES images (no video for the array path).
            'references' => ['nullable', 'array', 'max:'.self::MAX_REFERENCES],
            'references.*' => ['file', 'mimetypes:image/jpeg,image/png,image/webp,image/gif', 'max:20480'],
            'aspect_ratio' => ['nullable', 'string', 'in:'.implode(',', self::ASPECT_RATIOS)],
            // Optional JSON-encoded market read carried over from POST /generations/market.
            'market_read' => ['nullable', 'string'],
        ]);

        $marketRead = null;
        if (! empty($data['market_read'])) {
            $decoded = json_decode($data['market_read'], true);
            if (is_array($decoded)) {
                $marketRead = $decoded;
            }
        }

        $referencePaths = [];
        if ($request->hasFile('references')) {
            foreach ($request->file('references') as $file) {
                $referencePaths[] = $file->store('references', 'public');
            }
        }
        if ($request->hasFile('reference')) {
            // Single-file fallback: prepend so it stays the primary (sent to Gemini).
            array_unshift($referencePaths, $request->file('reference')->store('references', 'public'));
        }

        $generation = $request->user()->generations()->create([
            'idea' => $data['idea'],
            'industry' => $data['industry'],
            'competitors' => $data['competitors'],
            'elements' => $data['elements'] ?? null,
            'reference_url' => $data['reference_url'] ?? null,
            'reference_path' => $referencePaths[0] ?? null,
            'reference_paths' => $referencePaths,
            'market_read' => $marketRead,
            'aspect_ratio' => $data['aspect_ratio'] ?? '9:16',
            'status' => Generation::STATUS_PENDING,
        ]);

        $credential = $request->user()->credential;
        if (! $credential) {
            return response()->json(['message' => 'Add your API keys before generating.'], 422);
        }

        try {
            $service->engineerPrompt($generation, $credential);
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'generation' => $generation->fresh(),
            ], 502);
        }

        return response()->json($generation->fresh(), 201);
    }

    /**
     * Phase 2 — run the image model on the engineered prompt, producing 1..N variations.
     */
    public function image(Request $request, Generation $generation, GenerationService $service): JsonResponse
    {
        $this->authorizeOwner($request, $generation);

        // N sequential Gemini Flash calls (one per variation) can exceed 30s.
        set_time_limit(300);

        $payload = $request->validate([
            'variations' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_VARIATIONS],
        ]);
        $variations = $payload['variations'] ?? self::DEFAULT_VARIATIONS;

        $credential = $request->user()->credential;
        if (! $credential) {
            return response()->json(['message' => 'Add your API keys before generating.'], 422);
        }

        try {
            $service->generateImage($generation, $credential, $variations);
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'generation' => $generation->fresh(),
            ], 502);
        }

        return response()->json($generation->fresh());
    }

    /**
     * Canvas-safe image proxy: same backend origin + CORS (via HandleCors on
     * /api/*), so the frontend's Watermark Studio canvas can export without
     * tainting. Auth + ownership enforced.
     */
    public function imageFile(Request $request, Generation $generation): StreamedResponse
    {
        $this->authorizeOwner($request, $generation);

        // ?v=<index> selects a variation; defaults to the primary (= index 0).
        $variantIndex = max(0, (int) $request->query('v', 0));
        $paths = $generation->allImagePaths();
        $path = $paths[$variantIndex] ?? null;

        abort_unless($path && Storage::disk('public')->exists($path), 404);

        $mime = Storage::disk('public')->mimeType($path) ?: 'image/png';

        return Storage::disk('public')->response($path, null, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    public function destroy(Request $request, Generation $generation): JsonResponse
    {
        $this->authorizeOwner($request, $generation);

        $paths = array_merge($generation->allImagePaths(), $generation->allReferencePaths());
        foreach ($paths as $path) {
            if ($path && Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        }

        $generation->delete();

        return response()->json(null, 204);
    }

    private function authorizeOwner(Request $request, Generation $generation): void
    {
        abort_unless($generation->user_id === $request->user()->id, 403);
    }
}
