<?php

namespace App\Services\Image;

use App\Models\Generation;

/**
 * Routing rule for the dual-image strategy:
 *   - reference image uploaded  -> Gemini 2.5 Flash Image (conditioning, ~aspect)
 *   - no reference image        -> Imagen (strict aspect ratio)
 *
 * Aspect ratio is user-selectable in both paths (default 9:16).
 */
class ImageProviderFactory
{
    public function for(Generation $generation): ImageProviderInterface
    {
        return $generation->has_reference
            ? new GeminiFlashImageProvider()
            : new ImagenProvider();
    }
}
