<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
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
        You receive a marketing/creative brief and (when available) a MARKET READ. Convert
        all of that into a precise, production-ready image specification.

        STEP 1 — CLASSIFY the brief into ONE primary category. The category drives the
        level of detail your `final_prompt` MUST include. The categories:

          • MARKETING_VISUAL — banner, ad, launch graphic, promo, hero banner, social ad,
            email header, landing-page hero, campaign visual.
          • PHOTOGRAPHY — product shot, lifestyle, portrait, editorial, food, real-world scene.
          • ILLUSTRATION — mascot, character, icon, vector art, sticker, infographic art.
          • EDITORIAL_CONCEPT — book cover, magazine spread, abstract concept, conceptual art.

        STEP 2 — WRITE the `final_prompt` as ONE rich natural-language paragraph
        (120–200 words for MARKETING_VISUAL and PHOTOGRAPHY; 90–150 for ILLUSTRATION and
        EDITORIAL_CONCEPT). It must satisfy the category checklist below.

        ==================== CATEGORY CHECKLISTS ====================

        MARKETING_VISUAL — the final_prompt MUST contain ALL of:
          1. Product / brand naming with a one-line value descriptor
             (e.g. "WhatCampaign, an all-in-one AI-powered Ad-Ops platform").
          2. Specific brand-tinted colors with hex codes when known, OR concrete named
             hues if the brand context doesn't specify. Always 2–4 named colors with
             role assignments (dominant / supporting / accent / CTA).
             Example: "deep royal blue (#21449B) dominant, crisp white supporting,
             electric cyan (#3B82F6) for CTA accents".
          3. Background treatment specifics — e.g. "soft gradient mesh transitioning
             from #21449B to a darker navy", "seamless studio paper", "blurred urban
             backdrop with bokeh".
          4. Aesthetic category — e.g. "clean tech-SaaS aesthetic", "warm consumer
             editorial", "luxury minimal", "Y2K maximal".
          5. Motif vocabulary appropriate to the brief. For tech/SaaS: flowing data
             lines, node-network particles, glowing orbs, dashboard/chart UI fragments,
             glassmorphism cards. For consumer: tactile materials, organic forms. For
             finance: geometric precision, grid systems.
          6. Typography family suggestion by name — e.g. "modern geometric sans-serif
             (Inter or Satoshi style)", "elegant serif (Tiempos or Söhne)",
             "humanist sans (Söhne or GT America)".
          7. Logo placement IF a brand is named — e.g. "logo top-left",
             "logo centered above the headline".
          8. On-image copy quoted LITERALLY when relevant:
             - Headline: 3–7 words in double-quotes.
             - Sub-text / supporting line in double-quotes (optional).
             - CTA button label in double-quotes, with shape cue
               (e.g. 'a glowing pill-shaped CTA reading "Get Early Access"').
             If the user did not provide copy, invent short, on-brand copy that fits.
          9. Composition with copy-safe zones, depth-of-field, surface details
             (e.g. "subtle glassmorphism cards showing campaign metrics, soft
             depth-of-field, generous negative space").
         10. Mood adjectives (2–4) AND quality cues
             ("professional and trustworthy mood, high-resolution, sharp, no clutter").

        PHOTOGRAPHY — the final_prompt MUST contain:
          1. Subject and specific pose / action.
          2. Setting / environment (concrete; named where useful).
          3. Lens and aperture (e.g. "85mm at f/1.8", "35mm at f/4 environmental").
          4. Lighting setup with Kelvin: key + fill + rim where relevant
             (e.g. "golden-hour rim light from camera-right at ~3200K, soft bounce fill").
          5. Composition: angle, framing rule, focus falloff.
          6. Palette: 3–5 named hues with role.
          7. Texture cues: grain, film stock allusion (e.g. "Portra-400-like grain").
          8. Mood (2–3 adjectives).

        ILLUSTRATION — the final_prompt MUST contain:
          1. Style by name (e.g. "cel-shaded vector", "gouache painting",
             "isometric 3D render in Cinema 4D / Octane style").
          2. Subject pose with personality cue (gaze, posture, accessory).
          3. Line work approach (clean weight, sketched, no lines).
          4. Shading approach (flat, soft gradient, dramatic chiaroscuro).
          5. Palette discipline: 3–5 hues with brand-color anchor.
          6. Silhouette readability cue (works at 64px / thumbnail size).
          7. Background treatment (solid, soft gradient, scene).

        EDITORIAL_CONCEPT — the final_prompt MUST contain:
          1. Visual metaphor or symbolic device.
          2. Medium / technique (e.g. "mixed-media collage", "double-exposure
             photograph", "risograph print").
          3. Composition and color symbolism.
          4. Texture and material cues.

        ==================== UNIVERSAL RULES ====================

        - Be SPECIFIC, not vague. "warm 3200K backlight from camera-right" ≫ "warm light".
          "Inter or Satoshi sans-serif" ≫ "modern font". "#21449B deep royal blue" ≫ "blue".
        - Quote on-image text LITERALLY: Headline: "Campaign Planning, Simplified."
        - Use hex codes whenever colors are given or implied by brand context.
        - NO meta commentary, lists, or phrases like "create an image of" / "this image shows".
        - Respect the requested aspect ratio (mention it once near the end of final_prompt).
        - Brand-safe. Do NOT invent real logos or trademarked text. If a brand is named in
          the brief, you may reference its name in quoted on-image copy but never fabricate
          its actual logo design.

        MARKET READ USAGE
        - Actively AVOID every cliche listed in market_read.visual_cliches_to_avoid.
        - Lean into market_read.differentiation_angles and palette_direction when they
          align with the brief.

        NEGATIVE PROMPT
        - 4–6 concrete items to avoid. Lead with the top market-read cliches; include
          common AI artifacts ("malformed text, distorted typography, extra fingers,
          visible watermarks") only when the brief involves typography or hands.

        STRUCTURED JSON FIELDS
        - `style` should reflect the category (e.g. "tech-SaaS marketing visual",
          "editorial product photography", "cel-shaded vector illustration").
        - `color_palette` should be an array of 3–5 hue names WITH hex codes when known
          (e.g. ["deep royal blue (#21449B)", "crisp white", "electric cyan (#3B82F6)"]).
        - `must_include_elements` should list 4–8 concrete elements (UI motifs, copy,
          composition rules) the image model must include.

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
        $count = (int) ($inputs['reference_image_count'] ?? 0);
        if ($count === 1) {
            $lines[] = 'A reference image is attached — use it for visual direction.';
        } elseif ($count > 1) {
            $lines[] = $count.' reference images are attached — synthesize their shared visual direction (style, palette, mood).';
        }

        if (! empty($inputs['market_read']) && is_array($inputs['market_read'])) {
            $mr = $inputs['market_read'];
            $lines[] = '';
            $lines[] = 'MARKET READ (use this to differentiate):';
            if (! empty($mr['summary'])) {
                $lines[] = '- summary: '.$mr['summary'];
            }
            if (! empty($mr['visual_cliches_to_avoid']) && is_array($mr['visual_cliches_to_avoid'])) {
                $lines[] = '- AVOID these visual cliches: '.implode('; ', $mr['visual_cliches_to_avoid']);
            }
            if (! empty($mr['differentiation_angles']) && is_array($mr['differentiation_angles'])) {
                $lines[] = '- LEAN INTO these differentiation angles: '.implode('; ', $mr['differentiation_angles']);
            }
            if (! empty($mr['palette_direction'])) {
                $lines[] = '- palette direction: '.$mr['palette_direction'];
            }
        }

        return implode("\n", $lines);
    }

    /**
     * @param  array{idea:string,industry:string,competitors:string,elements?:string,reference_url?:string,aspect_ratio:string,market_read?:array}  $inputs
     * @param  array<int, array{0:string,1:string}>  $referenceImages  list of [base64, mime]
     * @return array  decoded JSON object including `final_prompt`
     */
    public function engineerPrompt(
        string $apiKey,
        array $inputs,
        array $referenceImages = [],
        ?array $marketRead = null
    ): array {
        $inputs['has_reference_image'] = count($referenceImages) > 0;
        $inputs['reference_image_count'] = count($referenceImages);
        if ($marketRead) {
            $inputs['market_read'] = $marketRead;
        }

        $content = [];
        foreach ($referenceImages as [$b64, $mime]) {
            $content[] = [
                'type' => 'image',
                'source' => [
                    'type' => 'base64',
                    'media_type' => $mime ?: 'image/png',
                    'data' => $b64,
                ],
            ];
        }
        $content[] = ['type' => 'text', 'text' => $this->userPrompt($inputs)];

        $response = $this->postWithRetry($apiKey, 120, [
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
            throw new RuntimeException($this->describeFailure($response));
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
     * Schema for the clarifier: 2–3 multi-choice questions tailored to the brief.
     */
    private function clarifySchema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'questions' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'properties' => [
                            'id' => ['type' => 'string'],
                            'question' => ['type' => 'string'],
                            'options' => [
                                'type' => 'array',
                                'items' => ['type' => 'string'],
                            ],
                        ],
                        'required' => ['id', 'question', 'options'],
                    ],
                ],
            ],
            'required' => ['questions'],
        ];
    }

    private function clarifySystemPrompt(): string
    {
        return <<<'SYS'
        You help a user articulate a visual brief for an AI image-generation tool.
        You are given their rough idea, optional industry/competitors, an optional template
        (e.g. "Product launch hero", "Scroll-stopping social ad"), and optional style/mood tags.

        Generate 3 TO 5 short, high-impact clarifying questions whose answers will most
        improve the final image. Each question MUST be multiple-choice with 3–5 concrete,
        mutually exclusive options (short noun phrases, 2–6 words each). The UI automatically
        adds a "Custom answer…" fallback to every question — do NOT include an "Other" option.

        QUESTION COUNT
        - 2–3 questions for simple briefs (single lifestyle photo, single mascot pose).
        - 4–5 questions for MARKETING briefs (banner / social ad / launch / hero / promo)
          where brand context, on-image copy, and CTA copy are critical to a good output.

        QUESTION PRIORITIES BY TEMPLATE TYPE

          MARKETING (banner / social ad / hero / launch / email header):
            Ask for these (in order of impact). Pick the 4–5 most missing:
            1. brand_palette — concrete palette directions like "deep royal blue + cyan",
               "warm coral + cream", "monochrome charcoal + lime", "muted earth + ochre".
            2. headline_copy — give 3–4 short candidate headlines (3–6 words each) tied
               to the brief. Example for an AI Ad-Ops launch: "Campaign Planning, Simplified.",
               "Ads That Actually Work.", "AI-Native Ad Operations.", "Launch Smarter Campaigns.".
            3. cta_copy — common CTA labels: "Get Early Access", "Start Free Trial",
               "See Demo", "Join the Waitlist".
            4. motif_vibe — "glassmorphism + data viz", "geometric particles + nodes",
               "soft gradient mesh", "photographic + minimal UI".
            5. typography_feel — "modern geometric sans (Inter/Satoshi)", "elegant serif",
               "humanist sans (Söhne/GT America)", "techy mono accent".

          PRODUCT / PHOTOGRAPHY:
            1. background — "seamless studio paper", "in-context lifestyle", "abstract
               gradient", "moody dark backdrop".
            2. lighting_mood — "high-key bright", "dramatic single source", "golden-hour
               warm", "soft overcast diffuse".
            3. composition — "centered hero", "rule-of-thirds with negative space",
               "macro close-up", "low-angle dramatic".
            4. palette_direction (if not implied by tags).

          MASCOT / ILLUSTRATION:
            1. pose — "three-quarter portrait", "full-body action", "sticker silhouette",
               "sitting friendly pose".
            2. rendering_style — "cel-shaded flat vector", "soft 3D render", "hand-painted
               gouache", "minimal line-art".
            3. personality_cue — "warm and friendly", "cheeky and playful", "calm and
               focused", "energetic and bold".
            4. palette_anchor (brand hue family).

          LIFESTYLE / EDITORIAL:
            1. setting — "urban street", "minimal home interior", "outdoor nature",
               "café/workspace".
            2. time_of_day — "golden hour", "blue hour", "overcast diffuse", "bright midday".
            3. people_presence — "no people", "hands only", "candid subject", "group scene".

        STRICT OUTPUT RULES
        - `id` is short snake_case (e.g. "headline_copy", "brand_palette").
        - `question` is a single sentence ending in "?".
        - `options` are short noun phrases. For headline_copy and cta_copy, the OPTIONS
          themselves should be candidate text strings (the user will likely use Custom to
          write their own anyway, but options give them a head start).
        - Don't ask for things already supplied in the brief or implied by the template
          and style tags. Skip a default question and add a sharper one if you can.

        Return ONLY the structured JSON matching the schema.
        SYS;
    }

    /**
     * Ask Claude for 2–3 tailored multi-choice clarifying questions for the brief.
     *
     * @param  array{idea:string,industry?:?string,competitors?:?string,template?:?string,style_tags?:array<string>,mood_tags?:array<string>}  $inputs
     * @return array<int, array{id:string,question:string,options:array<int,string>}>
     */
    public function clarifyBrief(string $apiKey, array $inputs): array
    {
        $lines = ['IDEA: '.$inputs['idea']];
        if (! empty($inputs['industry'])) {
            $lines[] = 'INDUSTRY: '.$inputs['industry'];
        }
        if (! empty($inputs['competitors'])) {
            $lines[] = 'COMPETITORS: '.$inputs['competitors'];
        }
        if (! empty($inputs['template'])) {
            $lines[] = 'TEMPLATE: '.$inputs['template'];
        }
        if (! empty($inputs['style_tags'])) {
            $lines[] = 'STYLE TAGS: '.implode(', ', $inputs['style_tags']);
        }
        if (! empty($inputs['mood_tags'])) {
            $lines[] = 'MOOD TAGS: '.implode(', ', $inputs['mood_tags']);
        }

        $response = $this->postWithRetry($apiKey, 60, [
            'model' => config('services.anthropic.model'),
            'max_tokens' => 1024,
            'system' => $this->clarifySystemPrompt(),
            'messages' => [
                ['role' => 'user', 'content' => [['type' => 'text', 'text' => implode("\n", $lines)]]],
            ],
            'output_config' => [
                'format' => [
                    'type' => 'json_schema',
                    'schema' => $this->clarifySchema(),
                ],
            ],
        ]);

        if (! $response->successful()) {
            throw new RuntimeException($this->describeFailure($response));
        }

        $body = $response->json();
        if (($body['stop_reason'] ?? null) === 'refusal') {
            throw new RuntimeException('Claude declined this request. Please adjust your inputs.');
        }

        $text = collect($body['content'] ?? [])->firstWhere('type', 'text')['text'] ?? null;
        $data = $text ? json_decode($text, true) : null;

        if (! is_array($data) || ! is_array($data['questions'] ?? null) || empty($data['questions'])) {
            throw new RuntimeException('Claude returned no clarifying questions.');
        }

        return $data['questions'];
    }

    private function inspireSystemPrompt(): string
    {
        return <<<'SYS'
        You are a creative director helping a founder decide what visual to generate next.
        Given a company name and a 1–3 sentence description of what they do, use the
        web_search tool to learn about the company (their site, social, recent news) and
        their broader category. Make 2–4 focused searches.

        Then return 4 distinct creative concept suggestions the founder could generate as
        an image RIGHT NOW. Each suggestion is a fully-formed mini-brief they can run with.

        DIVERSITY RULE: the 4 suggestions must cover DIFFERENT use cases — pick 4 of
        these: launch banner, product hero, social ad, founder/team portrait,
        lifestyle/in-context, mascot/icon, hero banner for the homepage, holiday hook.

        For each suggestion provide:
          - title: 3–6 word headline of the concept (e.g. "AI-native launch banner").
          - hook: one sentence explaining WHY this works given what you learned about
            the company and its category.
          - template_id: one of:
              "product-launch", "social-ad", "hero-banner", "mascot", "holiday", "lifestyle"
          - idea: a 2–4 sentence concrete creative direction the prompt engineer can run with.
            Reference the company name. Include any relevant visual angle you learned from
            your search (their existing color direction, vibe, audience).
          - elements: 3–6 short concrete cues (composition, lighting, motifs) — same flavor
            as `must_include_elements` later in the pipeline.
          - aspect_ratio: one of "1:1", "9:16", "16:9", "4:3", "3:4".
          - style_tags: 1–3 tags from this set ONLY:
              Photoreal, Cinematic, Minimalist, Vibrant, Vintage, 3D Render, Illustration, Editorial.
          - mood_tags: 1–3 tags from this set ONLY:
              Premium, Energetic, Calm, Playful, Trustworthy, Aspirational, Warm,
              Mysterious, Confident, Joyful, Friendly.

        Output format — return ONLY a single JSON code block, no other text:
        ```json
        {
          "suggestions": [
            {
              "title": "...",
              "hook": "...",
              "template_id": "social-ad",
              "idea": "...",
              "elements": "comma, separated, short, cues",
              "aspect_ratio": "9:16",
              "style_tags": ["Vibrant","Editorial"],
              "mood_tags": ["Energetic"]
            }
          ]
        }
        ```
        SYS;
    }

    /**
     * Inspiration: given a company + what they do, use web_search to research them
     * and return 4 diverse, ready-to-run creative concepts.
     *
     * @param  array{company_name:string,what_company_does:string,industry?:?string}  $inputs
     * @return array<int, array{title:string,hook:string,template_id:string,idea:string,elements:string,aspect_ratio:string,style_tags:array<int,string>,mood_tags:array<int,string>}>
     */
    public function suggestConcepts(string $apiKey, array $inputs): array
    {
        $lines = [
            'COMPANY NAME: '.$inputs['company_name'],
            'WHAT THEY DO: '.$inputs['what_company_does'],
        ];
        if (! empty($inputs['industry'])) {
            $lines[] = 'INDUSTRY: '.$inputs['industry'];
        }

        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => config('services.anthropic.version'),
            'content-type' => 'application/json',
        ])->timeout(180)->post(config('services.anthropic.base_url').'/v1/messages', [
            'model' => config('services.anthropic.model'),
            'max_tokens' => 4096,
            'system' => $this->inspireSystemPrompt(),
            'tools' => [[
                'type' => 'web_search_20250305',
                'name' => 'web_search',
                'max_uses' => 4,
            ]],
            'messages' => [
                ['role' => 'user', 'content' => implode("\n", $lines)],
            ],
        ]);

        if (! $response->successful()) {
            throw new RuntimeException($this->describeFailure($response));
        }

        $body = $response->json();
        if (($body['stop_reason'] ?? null) === 'refusal') {
            throw new RuntimeException('Claude declined the inspiration request.');
        }

        $text = '';
        foreach ($body['content'] ?? [] as $block) {
            if (($block['type'] ?? null) === 'text' && ! empty($block['text'])) {
                $text .= $block['text']."\n";
            }
        }

        $data = $this->extractJson($text);
        if (! is_array($data) || ! is_array($data['suggestions'] ?? null) || empty($data['suggestions'])) {
            throw new RuntimeException('Claude returned no usable suggestions.');
        }

        $allowedTemplates = ['product-launch', 'social-ad', 'hero-banner', 'mascot', 'holiday', 'lifestyle'];
        $allowedAspects = ['1:1', '9:16', '16:9', '4:3', '3:4'];

        $out = [];
        foreach ($data['suggestions'] as $s) {
            if (! is_array($s) || empty($s['title']) || empty($s['idea'])) {
                continue;
            }
            $out[] = [
                'title' => (string) $s['title'],
                'hook' => (string) ($s['hook'] ?? ''),
                'template_id' => in_array($s['template_id'] ?? '', $allowedTemplates, true)
                    ? $s['template_id'] : 'hero-banner',
                'idea' => (string) $s['idea'],
                'elements' => (string) ($s['elements'] ?? ''),
                'aspect_ratio' => in_array($s['aspect_ratio'] ?? '', $allowedAspects, true)
                    ? $s['aspect_ratio'] : '16:9',
                'style_tags' => is_array($s['style_tags'] ?? null)
                    ? array_values(array_filter(array_map('strval', $s['style_tags']))) : [],
                'mood_tags' => is_array($s['mood_tags'] ?? null)
                    ? array_values(array_filter(array_map('strval', $s['mood_tags']))) : [],
            ];
        }

        if (empty($out)) {
            throw new RuntimeException('Claude returned no usable suggestions.');
        }

        return $out;
    }

    private function marketSystemPrompt(): string
    {
        return <<<'SYS'
        You are a visual market researcher. Given a creative brief (idea, industry, competitor
        names), use the web_search tool to look at how the named competitors and the broader
        category currently present themselves visually (websites, product pages, recent campaigns,
        social ads). Then return a tight, ACTIONABLE market read for a prompt engineer.

        Make 2–4 focused searches. Prefer official sites and recent imagery. You do not need to
        cite URLs in the output — just synthesize what you saw.

        Output format — return ONLY a single JSON code block, no other text:
        ```json
        {
          "summary": "1–2 sentence read on the category's dominant visual language",
          "competitor_visuals": [
            {"name": "Brand A", "common_traits": "short description of their look"}
          ],
          "visual_cliches_to_avoid": ["concrete, observable cliche 1", "cliche 2", "cliche 3"],
          "differentiation_angles": ["concrete angle 1", "angle 2", "angle 3"],
          "palette_direction": "1 sentence on color/light direction that would stand out"
        }
        ```

        Be CONCRETE and SPECIFIC. "Modern" and "vibrant" are useless. "Flat pastel gradients with
        sans-serif kerned-tight headlines" is useful. Cliches should be things a viewer would
        recognize ("token diverse stock photo on white background"), not vague genres.
        SYS;
    }

    /**
     * Use Claude + the web_search server tool to research what the category and named
     * competitors look like visually, and return a structured market read.
     *
     * @param  array{idea:string,industry:string,competitors:string,template?:?string,style_tags?:array<string>,mood_tags?:array<string>}  $inputs
     * @return array{summary:string,competitor_visuals:array,visual_cliches_to_avoid:array,differentiation_angles:array,palette_direction:string}
     */
    public function marketResearch(string $apiKey, array $inputs): array
    {
        $lines = [
            'IDEA: '.$inputs['idea'],
            'FIELD / INDUSTRY: '.$inputs['industry'],
            'COMPETITORS: '.$inputs['competitors'],
        ];
        if (! empty($inputs['template'])) {
            $lines[] = 'TEMPLATE: '.$inputs['template'];
        }
        if (! empty($inputs['style_tags'])) {
            $lines[] = 'STYLE TAGS: '.implode(', ', $inputs['style_tags']);
        }
        if (! empty($inputs['mood_tags'])) {
            $lines[] = 'MOOD TAGS: '.implode(', ', $inputs['mood_tags']);
        }

        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => config('services.anthropic.version'),
            'content-type' => 'application/json',
        ])->timeout(120)->post(config('services.anthropic.base_url').'/v1/messages', [
            'model' => config('services.anthropic.model'),
            'max_tokens' => 2048,
            'system' => $this->marketSystemPrompt(),
            'tools' => [[
                'type' => 'web_search_20250305',
                'name' => 'web_search',
                'max_uses' => 4,
            ]],
            'messages' => [
                ['role' => 'user', 'content' => implode("\n", $lines)],
            ],
        ]);

        if (! $response->successful()) {
            throw new RuntimeException($this->describeFailure($response));
        }

        $body = $response->json();
        if (($body['stop_reason'] ?? null) === 'refusal') {
            throw new RuntimeException('Claude declined the market research request.');
        }

        // Collect every text block (model may output several around tool uses).
        $text = '';
        foreach ($body['content'] ?? [] as $block) {
            if (($block['type'] ?? null) === 'text' && ! empty($block['text'])) {
                $text .= $block['text']."\n";
            }
        }

        $data = $this->extractJson($text);
        if (! is_array($data) || empty($data['summary'])) {
            throw new RuntimeException('Claude returned an unparseable market read.');
        }

        // Normalize shape — every field present, arrays guaranteed.
        return [
            'summary' => (string) $data['summary'],
            'competitor_visuals' => is_array($data['competitor_visuals'] ?? null) ? $data['competitor_visuals'] : [],
            'visual_cliches_to_avoid' => is_array($data['visual_cliches_to_avoid'] ?? null) ? array_values(array_filter(array_map('strval', $data['visual_cliches_to_avoid']))) : [],
            'differentiation_angles' => is_array($data['differentiation_angles'] ?? null) ? array_values(array_filter(array_map('strval', $data['differentiation_angles']))) : [],
            'palette_direction' => (string) ($data['palette_direction'] ?? ''),
        ];
    }

    /** Find a JSON object inside a text blob — handles fenced ```json blocks or raw JSON. */
    private function extractJson(string $text): ?array
    {
        if (preg_match('/```json\s*(.*?)\s*```/s', $text, $m)) {
            $decoded = json_decode($m[1], true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        $start = strpos($text, '{');
        $end = strrpos($text, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $decoded = json_decode(substr($text, $start, $end - $start + 1), true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
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

    /**
     * POST /v1/messages with retry on transient errors (429, 502, 503, 504, 529).
     * Three attempts total with exponential backoff (0.8s → 2s → 4s) plus the
     * server's `retry-after` header when present.
     */
    private function postWithRetry(string $apiKey, int $timeoutSeconds, array $payload): Response
    {
        $url = config('services.anthropic.base_url').'/v1/messages';
        $headers = [
            'x-api-key' => $apiKey,
            'anthropic-version' => config('services.anthropic.version'),
            'content-type' => 'application/json',
        ];
        $transient = [429, 502, 503, 504, 529];
        $delaysMs = [800, 2000, 4000];

        $response = null;
        foreach ($delaysMs as $i => $delayMs) {
            $response = Http::withHeaders($headers)->timeout($timeoutSeconds)->post($url, $payload);

            if (! in_array($response->status(), $transient, true)) {
                return $response;
            }
            if ($i === count($delaysMs) - 1) {
                break; // out of retries — return the final failed response
            }

            // Honor server-suggested backoff if present.
            $retryAfter = (int) $response->header('retry-after');
            $sleepMs = $retryAfter > 0 ? min($retryAfter * 1000, 10000) : $delayMs;
            usleep($sleepMs * 1000);
        }

        return $response;
    }

    private function describeFailure(Response $response): string
    {
        $status = $response->status();
        if ($status === 529) {
            return 'Claude is temporarily overloaded. Please try again in a moment.';
        }
        if ($status === 429) {
            return 'Claude rate limit reached on your key. Wait a moment and retry.';
        }
        return 'Claude request failed ('.$status.'): '.$this->errorMessage($response->json());
    }
}
