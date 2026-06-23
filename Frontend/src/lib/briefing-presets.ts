export type BriefingTemplate = {
  id: string;
  label: string;
  icon: string;
  /** One-line outcome description shown on the card. */
  description: string;
  /** "Best for" tag — a concrete use case, shown beneath the description. */
  bestFor: string;
  /** What gets pre-filled (3–4 short bullets), shown when the template is selected. */
  fills: string[];
  prefill: {
    idea: string;
    industry?: string;
    elements?: string;
    aspect_ratio?: string;
    style_tags?: string[];
    mood_tags?: string[];
  };
};

export const BRIEFING_TEMPLATES: BriefingTemplate[] = [
  {
    id: "product-launch",
    label: "Product launch hero",
    icon: "📦",
    description: "Studio-grade hero shot where the product is unmistakable.",
    bestFor: "PDP, press kit, launch landing page",
    fills: [
      "85mm at f/4 product photography",
      "3-point lighting, rim light on the silhouette",
      "Rule-of-thirds with copy-safe negative space",
      "Square 1:1 by default — works in PDP and social",
    ],
    prefill: {
      idea:
        "A studio hero photograph of [PRODUCT] on a seamless paper backdrop, the product positioned slightly left-of-center and tilted three-quarters toward the camera so its silhouette and primary surface read instantly. Shot on an 85mm lens at f/4 — product tack-sharp, edges falling into a soft, painterly bokeh. Three-point lighting: a large key light at 45° camera-right, low-intensity fill from below to lift shadows, and a tight rim light catching the top edge to separate the product from the backdrop. The shot feels confident and editorial, not loud.",
      elements:
        "85mm lens at f/4, 5500K key light, rim light on top edge, subtle contact shadow, rule-of-thirds with copy-safe negative space camera-right, brand-tinted neutral backdrop with one bold accent hue",
      aspect_ratio: "1:1",
      style_tags: ["Photoreal", "Editorial", "Minimalist"],
      mood_tags: ["Premium", "Confident"],
    },
  },
  {
    id: "social-ad",
    label: "Scroll-stopping social ad",
    icon: "📱",
    description: "Vertical creative built to read in under a second.",
    bestFor: "Stories, Reels, TikTok, Shorts",
    fills: [
      "9:16 vertical, subject in upper 60%",
      "Saturated complementary palette",
      "One central focal point, radiating leading lines",
      "Lower third reserved for caption overlay",
    ],
    prefill: {
      idea:
        "A scroll-stopping vertical visual for [PRODUCT/SERVICE]. The subject sits in the upper 60% of the frame at a slightly unexpected angle — foreshortened, low or overhead — so the eye snaps to it instantly. Bold complementary palette: a saturated foreground subject against a deeply contrasting background, with radiating compositional lines (light rays, perspective edges, repeating shapes) pulling the eye inward to the focal point. Subject is optically sharp; background has subtle bokeh and a touch of motion blur to suggest energy. The lower third is intentionally simpler — flat color and quiet texture — so a one-line caption overlays cleanly.",
      elements:
        "subject in upper 60% of frame, complementary saturated palette, radiating leading lines toward focal point, slight peripheral motion blur, clean lower third for overlay text, high local contrast",
      aspect_ratio: "9:16",
      style_tags: ["Vibrant", "Editorial", "Cinematic"],
      mood_tags: ["Energetic", "Confident"],
    },
  },
  {
    id: "hero-banner",
    label: "Cinematic hero banner",
    icon: "🎨",
    description: "Wide, breathable, copy-safe homepage cover.",
    bestFor: "Homepage hero, marketing site cover",
    fills: [
      "16:9 widescreen, anamorphic feel",
      "Off-center subject with copy-safe left third",
      "Soft directional light, low contrast",
      "Restrained palette: 3 named hues",
    ],
    prefill: {
      idea:
        "A wide, cinematic hero banner conveying [THE BIG IDEA]. Anamorphic feel: subject placed in the right two-thirds of the frame, environment opening up to its left to leave a deliberate copy-safe zone for a headline. Soft directional light from camera-right, ~4500K, with gentle atmospheric haze adding depth to the background. Restrained palette — three named hues, one warm focal accent against two cool background tones — for an unhurried, confident read. Subject in tack-sharp focus, mid-distance environment in slight focus falloff, far background painterly.",
      elements:
        "off-center subject in right two-thirds, copy-safe left third, soft directional 4500K key, atmospheric haze for depth, 3-hue palette (1 warm focal + 2 cool background), shallow focus falloff",
      aspect_ratio: "16:9",
      style_tags: ["Cinematic", "Minimalist", "Editorial"],
      mood_tags: ["Trustworthy", "Calm", "Confident"],
    },
  },
  {
    id: "mascot",
    label: "Brand mascot character",
    icon: "🦊",
    description: "Memorable character with a distinctive silhouette.",
    bestFor: "App icon, packaging, social avatar",
    fills: [
      "Square 1:1, full body or 3/4 portrait",
      "Strong silhouette readable at thumbnail size",
      "Limited palette — brand color + 2 accents",
      "Friendly geometry, expressive face",
    ],
    prefill: {
      idea:
        "A friendly brand mascot character for [BRAND], designed silhouette-first so it reads instantly at thumbnail size. Soft, rounded geometry with one or two distinctive shape signatures (ears, posture, accessory) that make it instantly recognizable. Three-quarter portrait pose with a warm, slightly tilted gaze toward the viewer, mouth in a relaxed half-smile. Cel-shaded with clean line work — no rendered photorealism. Limited palette: the brand's primary hue dominates, two complementary accents, a single high-contrast detail for visual pop.",
      elements:
        "silhouette-first design readable at 64px, three-quarter portrait, soft rounded geometry, cel-shading with clean line work, brand primary + 2 accents + 1 pop color, eye-level camera",
      aspect_ratio: "1:1",
      style_tags: ["Illustration", "3D Render"],
      mood_tags: ["Playful", "Friendly", "Warm"],
    },
  },
  {
    id: "holiday",
    label: "Holiday / seasonal campaign",
    icon: "🎄",
    description: "Warm seasonal moment tied to the brand.",
    bestFor: "Email header, gift-card art, social hero",
    fills: [
      "4:3 landscape, generous space for greeting",
      "Practical lights (candles/fairy lights) at ~2700K",
      "One signature seasonal motif, not five",
      "Warm dominant + cool accent for contrast",
    ],
    prefill: {
      idea:
        "A warm, intimate seasonal visual celebrating [HOLIDAY] in a way that feels specific to [BRAND], not generic stock. Restrained set dressing: one signature seasonal motif as the hero element rather than a cluttered montage. Practical lights — candles, fairy lights, hearth glow at ~2700K — provide most of the illumination, with a soft cool fill from a window or off-frame source for separation. Composition leaves a clean, low-clutter area for greeting copy. Tactile materials in frame (linen, brushed brass, pine, wax) carry the warmth.",
      elements:
        "one signature seasonal motif (not montage), practical 2700K lights, cool fill for separation, copy-safe quiet zone, tactile materials (linen/brass/wood), warm dominant palette with one cool accent",
      aspect_ratio: "4:3",
      style_tags: ["Photoreal", "Editorial", "Cinematic"],
      mood_tags: ["Warm", "Joyful", "Premium"],
    },
  },
  {
    id: "lifestyle",
    label: "Lifestyle / editorial",
    icon: "📸",
    description: "Aspirational candid scene with the product in real context.",
    bestFor: "About page, campaign launch, brand book",
    fills: [
      "3:4 portrait, observational framing",
      "Natural window light, slight grain",
      "Candid pose — looking past the camera",
      "Environment signals the target customer",
    ],
    prefill: {
      idea:
        "An aspirational lifestyle photograph featuring [PRODUCT/SERVICE] in authentic everyday context — an environment that visually signals the target customer's life. Observational, slightly documentary framing: subject occupied with a real task, gaze directed past the camera rather than into it. Natural window light from camera-left at golden-hour warmth (~3200K), with a subtle bounce filling shadows. Mid-distance environmental detail in soft focus, a faint film grain for texture. The product is present and credible in the moment, not staged front-and-center.",
      elements:
        "observational framing (subject not facing camera), natural window light ~3200K from camera-left, soft bounce fill, mid-distance focus falloff, faint film grain, product integrated into a real task",
      aspect_ratio: "3:4",
      style_tags: ["Editorial", "Photoreal", "Cinematic"],
      mood_tags: ["Aspirational", "Warm", "Calm"],
    },
  },
];

export const STYLE_TAGS = [
  "Photoreal",
  "Cinematic",
  "Minimalist",
  "Vibrant",
  "Vintage",
  "3D Render",
  "Illustration",
  "Editorial",
] as const;

export const MOOD_TAGS = [
  "Premium",
  "Energetic",
  "Calm",
  "Playful",
  "Trustworthy",
  "Aspirational",
  "Warm",
  "Mysterious",
  "Confident",
  "Joyful",
  "Friendly",
] as const;
