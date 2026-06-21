<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Generation;
use App\Services\GenerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class GenerationController extends Controller
{
    private const ASPECT_RATIOS = ['9:16', '16:9', '1:1', '3:4', '4:3'];

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
     * Phase 1 — accept the ideation form, store any reference file, run Claude.
     */
    public function store(Request $request, GenerationService $service): JsonResponse
    {
        $data = $request->validate([
            'idea' => ['required', 'string', 'max:5000'],
            'industry' => ['required', 'string', 'max:255'],
            'competitors' => ['required', 'string', 'max:1000'],
            'elements' => ['nullable', 'string', 'max:2000'],
            'reference_url' => ['nullable', 'url', 'max:2000'],
            'reference' => ['nullable', 'file', 'mimetypes:image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime', 'max:20480'],
            'aspect_ratio' => ['nullable', 'string', 'in:'.implode(',', self::ASPECT_RATIOS)],
        ]);

        $referencePath = null;
        if ($request->hasFile('reference')) {
            $referencePath = $request->file('reference')->store('references', 'public');
        }

        $generation = $request->user()->generations()->create([
            'idea' => $data['idea'],
            'industry' => $data['industry'],
            'competitors' => $data['competitors'],
            'elements' => $data['elements'] ?? null,
            'reference_url' => $data['reference_url'] ?? null,
            'reference_path' => $referencePath,
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
     * Phase 2 — run the image model on the engineered prompt.
     */
    public function image(Request $request, Generation $generation, GenerationService $service): JsonResponse
    {
        $this->authorizeOwner($request, $generation);

        $credential = $request->user()->credential;
        if (! $credential) {
            return response()->json(['message' => 'Add your API keys before generating.'], 422);
        }

        try {
            $service->generateImage($generation, $credential);
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

        abort_unless($generation->image_path && Storage::disk('public')->exists($generation->image_path), 404);

        $mime = Storage::disk('public')->mimeType($generation->image_path) ?: 'image/png';

        return Storage::disk('public')->response($generation->image_path, null, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    public function destroy(Request $request, Generation $generation): JsonResponse
    {
        $this->authorizeOwner($request, $generation);

        foreach ([$generation->image_path, $generation->reference_path] as $path) {
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
