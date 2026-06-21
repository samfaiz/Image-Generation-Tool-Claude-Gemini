<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiCredential;
use App\Services\AnthropicService;
use App\Services\Image\GeminiModelResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CredentialController extends Controller
{
    /**
     * Return only non-secret status (presence, last-4, verification).
     */
    public function show(Request $request): JsonResponse
    {
        $cred = $request->user()->credential;

        return response()->json($this->present($cred));
    }

    /**
     * Store/replace API keys (encrypted AES-256-CBC). Optionally test-ping Claude.
     */
    public function update(Request $request, AnthropicService $anthropic): JsonResponse
    {
        $data = $request->validate([
            'claude_key' => ['nullable', 'string', 'max:500'],
            'gemini_key' => ['nullable', 'string', 'max:500'],
            'imagen_model' => ['sometimes', 'nullable', 'string', 'max:100'],
            'flash_model' => ['sometimes', 'nullable', 'string', 'max:100'],
            'verify' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();
        $cred = $user->credential ?: new ApiCredential(['user_id' => $user->id]);

        $verifyErrors = [];

        // Preferred image models (empty string => Auto / null).
        if ($request->has('imagen_model')) {
            $cred->imagen_model = $data['imagen_model'] ?: null;
        }
        if ($request->has('flash_model')) {
            $cred->flash_model = $data['flash_model'] ?: null;
        }

        if (! empty($data['claude_key'])) {
            $cred->claude_key = $data['claude_key'];
            $cred->claude_verified_at = null;

            if ($request->boolean('verify')) {
                if ($anthropic->verifyKey($data['claude_key'])) {
                    $cred->claude_verified_at = now();
                } else {
                    $verifyErrors['claude_key'] = 'Claude key could not be verified.';
                }
            }
        }

        if (! empty($data['gemini_key'])) {
            $cred->gemini_key = $data['gemini_key'];
            // Gemini verification happens lazily on first generation to avoid an
            // extra paid round-trip; we just store it here.
            $cred->gemini_verified_at = null;
        }

        $cred->user_id = $user->id;
        $cred->save();

        return response()->json([
            'credentials' => $this->present($cred->fresh()),
            'verify_errors' => $verifyErrors,
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        optional($request->user()->credential)->delete();

        return response()->json(null, 204);
    }

    /**
     * Live list of image-capable Gemini models for the user's key, so the UI
     * can offer every available model (including ones released in the future).
     */
    public function models(Request $request, GeminiModelResolver $resolver): JsonResponse
    {
        $cred = $request->user()->credential;

        if (! $cred || ! $cred->hasGeminiKey()) {
            return response()->json(['predict' => [], 'generate' => []]);
        }

        return response()->json($resolver->available($cred->gemini_key));
    }

    private function present(?ApiCredential $cred): array
    {
        return [
            'has_claude' => $cred?->hasClaudeKey() ?? false,
            'has_gemini' => $cred?->hasGeminiKey() ?? false,
            'claude_last4' => $cred?->claude_last4,
            'gemini_last4' => $cred?->gemini_last4,
            'claude_verified' => (bool) ($cred?->claude_verified_at),
            'gemini_verified' => (bool) ($cred?->gemini_verified_at),
            'imagen_model' => $cred?->imagen_model,
            'flash_model' => $cred?->flash_model,
        ];
    }
}
