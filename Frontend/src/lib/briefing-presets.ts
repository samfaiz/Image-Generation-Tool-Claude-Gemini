/**
 * Briefing templates — each is a production-grade shot brief with sub-categories
 * (variant layouts) and structured fields. Filling the fields composes the final
 * Idea text via {{key}} / {{?key}}…{{/key}} substitution in the sub-category's
 * `idea_template`.
 */

export type FieldType = "text" | "textarea" | "select";

export type TemplateField = {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  /** Only for type="select". The first option (often "—") is treated as empty. */
  options?: string[];
};

export type SubCategory = {
  id: string;
  label: string;
  description: string;
  aspect_ratio: string;
  /**
   * Mustache-lite template. Supports:
   *   {{field_id}}                 → value substitution
   *   {{?field_id}}…{{/field_id}}  → conditional block (included only if value is non-empty and not "—" / "none")
   */
  idea_template: string;
  style_tags_override?: string[];
  mood_tags_override?: string[];
};

export type BriefingTemplate = {
  id: string;
  label: string;
  icon: string;
  description: string;
  bestFor: string;
  fills: string[];
  /** Structured input fields shown to the user when this template is selected. */
  fields: TemplateField[];
  /** Variant layouts for the template. */
  subcategories: SubCategory[];
  /**
   * Per-field-value content snippets that get injected wherever a sub-category's
   * idea_template references `{{=field_id}}`. Lookup key is `<field_id>__<slug(value)>`.
   * Example: `launch_type__software_saas` is the snippet shown when the user picked
   * "Software / SaaS" in the `launch_type` select.
   *
   * Snippets themselves may contain regular `{{field}}` and `{{?field}}…{{/field}}`
   * placeholders — they get expanded normally after substitution.
   */
  field_value_snippets?: Record<string, string>;
  prefill: {
    idea: string;
    industry?: string;
    elements?: string;
    aspect_ratio?: string;
    style_tags?: string[];
    mood_tags?: string[];
  };
};

// ---------------------------------------------------------------------------
// Composition helper
// ---------------------------------------------------------------------------

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Substitute field values into an idea_template. Supports three syntaxes
 * (applied in this order):
 *
 *   {{=field_id}}                 → snippet substitution. Looks up
 *                                   `${field_id}__${slug(value)}` in the
 *                                   `snippets` map and pastes that snippet
 *                                   in place. Empty if no match.
 *
 *   {{?field_id}}…{{/field_id}}   → conditional block. Contents kept when
 *                                   the value is non-empty and not "—",
 *                                   "none", or "n/a"; dropped otherwise.
 *
 *   {{field_id}}                  → plain value substitution.
 */
export function composeIdea(
  template: string,
  values: Record<string, string>,
  snippets?: Record<string, string>,
): string {
  // 1. Snippet substitutions: {{=field}}
  let out = template.replace(/\{\{=(\w+)\}\}/g, (_m, field) => {
    const v = (values[field] ?? "").trim();
    if (!v) return "";
    const key = `${field}__${slug(v)}`;
    return snippets?.[key] ?? "";
  });
  // 2. Conditional blocks: {{?key}}…{{/key}}
  out = out.replace(/\{\{\?(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_m, key, inner) => {
    const v = (values[key] ?? "").trim();
    if (!v) return "";
    const lc = v.toLowerCase();
    if (lc === "—" || lc === "none" || lc === "n/a") return "";
    return inner;
  });
  // 3. Plain substitutions: {{key}}
  out = out.replace(/\{\{(\w+)\}\}/g, (_m, key) => (values[key] ?? "").trim());
  // 4. Tidy whitespace
  return out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const BRIEFING_TEMPLATES: BriefingTemplate[] = [
  // ============================================================
  // 1. Product launch hero
  // ============================================================
  {
    id: "product-launch",
    label: "Product launch hero",
    icon: "📦",
    description: "Studio-grade shot where the product is unmistakable.",
    bestFor: "PDP, press kit, launch landing page",
    fills: [
      "85mm at f/4 product photography",
      "3-point lighting, rim light on the silhouette",
      "Rule-of-thirds with copy-safe negative space",
      "Square 1:1 by default — works in PDP and social",
    ],
    fields: [
      { id: "product_name", label: "Product name", type: "text", placeholder: "WhatCampaign", required: true },
      {
        id: "launch_type",
        label: "Launch type",
        type: "select",
        required: true,
        hint: "Picks the visual treatment — software gets a UI mock-up, hardware gets a studio shot, etc.",
        options: [
          "Software / SaaS",
          "ERP / B2B platform",
          "Mobile app",
          "Developer tool",
          "AI product",
          "Fintech",
          "Healthcare / MedTech",
          "E-commerce store",
          "Hardware product",
          "Consumer goods",
          "Service / agency",
          "Other",
        ],
      },
      { id: "product_type", label: "What is it (one phrase)?", type: "text", placeholder: "ad-ops dashboard / wireless earbuds / cold-brew can", required: true },
      { id: "material_finish", label: "Material, finish, or UI vibe", type: "text", placeholder: "brushed aluminum + matte black / dark-mode dashboard with glassmorphism / amber glass" },
      { id: "key_feature", label: "Key feature to emphasize", type: "text", placeholder: "noise-cancellation drivers / AI budget-allocation tab / single-origin beans" },
      { id: "brand_color", label: "Brand color", type: "text", placeholder: "deep royal blue #21449B" },
    ],
    field_value_snippets: {
      launch_type__software_saas:
        "The hero element is a polished 3D mock-up of the product UI inside a clean laptop or browser frame, the primary dashboard view tack-sharp, one key metric or feature card visually highlighted. Subtle SaaS motifs float in the composition — flowing data lines, glassmorphism cards showing campaign metrics, small UI fragments (a button, a chart preview, a notification toast) in soft focus. Typography across the UI reads as modern geometric sans (Inter or Satoshi style).",
      launch_type__erp_b2b_platform:
        "The hero element is a corporate-grade dashboard mock-up — a polished UI screen in a thin device frame, surrounded by faint org-chart connectors, multi-row data tables, and executive KPI cards in soft glassmorphism. Aesthetic reads trustworthy, enterprise, premium — not consumer-flashy.",
      launch_type__mobile_app:
        "The hero element is a 3D mock-up of the app on a modern smartphone, floating at a slight perspective with a soft device glow. The primary screen is in tack-sharp focus; two supporting screens fan out behind it in soft focus, hinting at the app's depth.",
      launch_type__developer_tool:
        "The hero element is a clean code editor or terminal mock-up in a dark device frame, one command or syntax-highlighted snippet acting as the visual hook. Surrounding motifs: monospace text fragments, soft particle scatter representing data flow, dark-mode aesthetic with a single brand-colored accent on a key token.",
      launch_type__ai_product:
        "The hero element is an interactive AI surface — a chat or generation UI in a clean frame, with one in-progress streaming element (typing cursor, generating spinner, partial result) catching the light. Surrounding motifs: neural-network particles, soft glowing orbs, faint embedding-space gradients in the background.",
      launch_type__fintech:
        "The hero element is a polished fintech dashboard — clean number-heavy UI, a chart with an upward sweep highlighted, glassmorphism cards over a subtle grid. The aesthetic reads premium, calm, trust-first — green or blue accents over deep neutrals.",
      launch_type__healthcare_medtech:
        "The hero element is the product (UI or device) photographed with clinical clarity against a calm, low-saturation backdrop. Soft directional light, generous whitespace, the focal element framed with surgical precision. Palette restrained — clinical white, brand color, one warm accent for humanity.",
      launch_type__e_commerce_store:
        "The hero element is a pack-shot of the featured SKU on a seamless backdrop, mouthwatering rim light catching the product silhouette. Composition leaves space for a price tag or 'Shop now' overlay. Palette emphasizes the brand color over neutrals.",
      launch_type__hardware_product:
        "The hero element is the physical product photographed with studio-grade hard light. Material surfaces — metal, glass, plastic, fabric — read clearly with sharp specular highlights and crisp edges. A tight rim light separates the silhouette; a subtle contact shadow grounds it. Shot on an 85mm lens at f/4 — product tack-sharp, edges falling into soft, painterly bokeh.",
      launch_type__consumer_goods:
        "The hero element is a tactile, lifestyle-leaning hero. Materials read warmly under directional natural light; supporting props (paper, ceramic, linen) sit in soft focus around the edges, signalling the product's place in the customer's life.",
      launch_type__service_agency:
        "The hero element is a confident editorial portrait or signature deliverable — a single conceptual object, a polished case-study artifact, or the team behind the work — captured with cinematic directional light. Surrounding motifs evoke craft and process without being literal. Aesthetic reads premium, considered, human.",
      launch_type__other: "",
    },
    subcategories: [
      {
        id: "studio-hero",
        label: "Studio hero",
        description: "Seamless backdrop, single focal element, copy-safe negative space.",
        aspect_ratio: "1:1",
        style_tags_override: ["Photoreal", "Editorial", "Minimalist"],
        mood_tags_override: ["Premium", "Confident"],
        idea_template: `A premium studio hero visual for the launch of {{product_name}}{{?product_type}} ({{product_type}}){{/product_type}}. {{=launch_type}} The composition centers the focal element slightly left-of-center on a seamless backdrop, generous copy-safe negative space camera-right for a headline; subtle gradient mesh behind.{{?material_finish}} Material / surface cues: {{material_finish}}.{{/material_finish}}{{?key_feature}} The visual hero is {{key_feature}}, emphasized through composition and light.{{/key_feature}}{{?brand_color}} Palette anchored on {{brand_color}} with neutral supporting tones and one bold accent.{{/brand_color}} Modern geometric sans-serif typography (Inter or Satoshi style) for any in-frame copy. Confident, editorial mood — not loud. High-resolution, sharp, no clutter.`,
      },
      {
        id: "lifestyle-launch",
        label: "Lifestyle in-context",
        description: "Product shown in the moment it's used, with environmental cues.",
        aspect_ratio: "4:3",
        style_tags_override: ["Photoreal", "Editorial", "Cinematic"],
        mood_tags_override: ["Aspirational", "Warm"],
        idea_template: `A lifestyle visual for the launch of {{product_name}}{{?product_type}} ({{product_type}}){{/product_type}} in an authentic, real-world moment of use. {{=launch_type}} The composition reads as observational and documentary — subject occupied with a task, gaze directed past the camera. Time-of-day light: warm golden-hour (~3200K) with a soft bounce filling shadows. Mid-distance environmental detail in soft focus, faint Portra-400-like film grain.{{?material_finish}} Surface / material cues: {{material_finish}}.{{/material_finish}}{{?key_feature}} A subtle visual cue hints at {{key_feature}}.{{/key_feature}}{{?brand_color}} Restrained palette around {{brand_color}}.{{/brand_color}} The product is present and credible in the moment, never staged.`,
      },
      {
        id: "feature-spotlight",
        label: "Feature spotlight",
        description: "Zoomed in on a single hero feature, with a callout caption.",
        aspect_ratio: "16:9",
        style_tags_override: ["Editorial", "Cinematic", "Minimalist"],
        mood_tags_override: ["Confident", "Premium"],
        idea_template: `A feature-spotlight visual for the launch of {{product_name}}{{?product_type}} ({{product_type}}){{/product_type}}, built around one hero capability. {{=launch_type}} The composition zooms in on {{?key_feature}}{{key_feature}}{{/key_feature}}{{?!key_feature}}the single most important interaction or capability{{/!key_feature}} — the rest of the product fades into soft focus around it. A small caption-style label sits in the negative space, single-line, in modern geometric sans (Inter / Satoshi).{{?material_finish}} Surface / UI cues: {{material_finish}}.{{/material_finish}}{{?brand_color}} A glowing {{brand_color}} accent isolates the spotlighted feature.{{/brand_color}} The framing reads "look here" without being literal — leading lines, depth-of-field, and light all point to the hero. Confident, didactic without being instructional.`,
      },
      {
        id: "announcement-teaser",
        label: "Announcement teaser",
        description: "Pre-launch tease — moody, partial reveal, date prominent.",
        aspect_ratio: "16:9",
        style_tags_override: ["Cinematic", "Minimalist", "Editorial"],
        mood_tags_override: ["Mysterious", "Confident", "Premium"],
        idea_template: `An anticipatory teaser visual for the upcoming launch of {{product_name}}{{?product_type}} ({{product_type}}){{/product_type}}. {{=launch_type}} The product or interface is partially revealed — emerging from shadow, half-illuminated by a single hard light, or behind a soft gradient veil — building intrigue rather than showing everything. A prominent date stamp or short teaser line sits in the negative space (modern geometric sans, generous letter-spacing).{{?material_finish}} A glimpse of the surface ({{material_finish}}) catches the key light.{{/material_finish}}{{?brand_color}} Palette anchored on {{brand_color}} with deep shadows.{{/brand_color}}{{?key_feature}} The reveal hints at {{key_feature}} without spelling it out.{{/key_feature}} Cinematic, low-key lighting; promotional, "coming soon" energy.`,
      },
      {
        id: "comparison-range",
        label: "Comparison / range",
        description: "Multiple variants side-by-side — colorways, tiers, or before/after.",
        aspect_ratio: "16:9",
        style_tags_override: ["Editorial", "Minimalist", "Photoreal"],
        mood_tags_override: ["Confident", "Premium"],
        idea_template: `A comparison / range visual for the launch of {{product_name}}{{?product_type}} ({{product_type}}){{/product_type}}. {{=launch_type}} The composition presents 3 distinct variants side-by-side at equal scale — could be colorways, tiers, model variants, or before/after states — on a unified backdrop, each lit identically so the differences read instantly. Subtle labels sit beneath each variant in modern geometric sans, kerned tight.{{?material_finish}} Variants share the {{material_finish}} surface treatment, differing in color or finish detail.{{/material_finish}}{{?brand_color}} Backdrop anchored on a desaturated {{brand_color}} tint so the variants pop.{{/brand_color}}{{?key_feature}} The comparison highlights {{key_feature}} as the differentiating axis.{{/key_feature}} Clean, didactic, decision-ready.`,
      },
      {
        id: "mockup-showcase",
        label: "Mock-up / device showcase",
        description: "3D mock-up of the digital product, ideal for SaaS / app / web.",
        aspect_ratio: "16:9",
        style_tags_override: ["3D Render", "Cinematic", "Editorial"],
        mood_tags_override: ["Premium", "Confident", "Trustworthy"],
        idea_template: `A polished 3D device mock-up showcase for the launch of {{product_name}}{{?product_type}} ({{product_type}}){{/product_type}}. {{=launch_type}} The hero device (laptop, phone, tablet, or browser window depending on launch type) is rendered at a slight three-quarter perspective with realistic glass, edge highlight, and soft contact shadow. The primary screen is tack-sharp and shows the product's signature view; 1–2 supporting screens fan out behind it in soft focus.{{?material_finish}} UI / surface cues on screen: {{material_finish}}.{{/material_finish}}{{?key_feature}} The main screen visibly features {{key_feature}}.{{/key_feature}}{{?brand_color}} Subtle gradient mesh background anchored on {{brand_color}}; device glow tuned to the brand.{{/brand_color}} Modern, premium, conversion-ready.`,
      },
      {
        id: "founder-portrait",
        label: "Founder / team portrait",
        description: "Human face of the launch — founder or team with the product.",
        aspect_ratio: "3:4",
        style_tags_override: ["Editorial", "Photoreal", "Cinematic"],
        mood_tags_override: ["Trustworthy", "Warm", "Confident"],
        idea_template: `An editorial portrait announcing the launch of {{product_name}}{{?product_type}} ({{product_type}}){{/product_type}} — the human face behind it. A founder or small team is photographed mid-gesture in a real working environment (workshop, studio, office); gaze slightly off-camera, posture confident and natural rather than posed. Soft directional window light from camera-left (~4500K), gentle bounce fill, faint Portra-400-like grain.{{?material_finish}} The product itself appears in the frame credibly — held, sitting on a surface, or visible on a screen ({{material_finish}}).{{/material_finish}} {{=launch_type}}{{?brand_color}} Single {{brand_color}} accent in the environment — a jacket, a wall, a fabric.{{/brand_color}} Editorial, magazine-cover energy; trust-first.`,
      },
      {
        id: "macro-detail",
        label: "Macro / detail close-up",
        description: "Extreme close-up of a single surface, button, or interaction.",
        aspect_ratio: "1:1",
        style_tags_override: ["Photoreal", "Editorial"],
        mood_tags_override: ["Premium", "Confident"],
        idea_template: `An extreme close-up hero detail of {{product_name}}{{?product_type}} ({{product_type}}){{/product_type}}. {{=launch_type}} The frame is filled by a single hero detail — a material surface, a UI affordance, a button press, or a key interaction — with a razor-thin focal plane and soft fall-off to creamy bokeh.{{?material_finish}} Hero surface: {{material_finish}}, with light glancing across to reveal microtexture or screen pixels.{{/material_finish}} A single hard key light camera-right (~4000K) creates definitive specular highlights; soft graphic shadow on the opposite side for contrast.{{?key_feature}} The composition draws attention to {{key_feature}}.{{/key_feature}}{{?brand_color}} A {{brand_color}} accent appears as a colour quotation in the bokeh.{{/brand_color}} Quiet, jewelry-grade reverence.`,
      },
      {
        id: "editorial-flatlay",
        label: "Editorial flat-lay / system shot",
        description: "Top-down arrangement of the product + supporting elements.",
        aspect_ratio: "4:3",
        style_tags_override: ["Photoreal", "Editorial", "Minimalist"],
        mood_tags_override: ["Premium", "Calm"],
        idea_template: `A top-down editorial flat-lay (or system-shot for digital products) featuring {{product_name}}{{?product_type}} ({{product_type}}){{/product_type}} arranged with 2–3 carefully chosen supporting elements that signal the use case. {{=launch_type}} Even, soft overhead daylight (~5000K) with a single hard shadow direction for graphic appeal. Mathematical composition — orthogonal, rule-of-thirds, generous breathing room.{{?material_finish}} Surface materials in frame: {{material_finish}}, plus paper, linen, or stone for tactile contrast.{{/material_finish}}{{?brand_color}} Palette anchored on {{brand_color}} with two neutral supports.{{/brand_color}}{{?key_feature}} One supporting element directly references {{key_feature}}.{{/key_feature}} Quiet, intentional, editorial.`,
      },
    ],
    prefill: {
      idea: "A studio hero photograph of [PRODUCT] on a seamless paper backdrop, the product positioned slightly left-of-center.",
      elements:
        "85mm lens at f/4, 5500K key light, rim light on top edge, subtle contact shadow, rule-of-thirds with copy-safe negative space, brand-tinted neutral backdrop",
      aspect_ratio: "1:1",
      style_tags: ["Photoreal", "Editorial", "Minimalist"],
      mood_tags: ["Premium", "Confident"],
    },
  },

  // ============================================================
  // 2. Social ad
  // ============================================================
  {
    id: "social-ad",
    label: "Scroll-stopping social ad",
    icon: "📱",
    description: "Vertical creative built to read in under a second.",
    bestFor: "Stories, Reels, TikTok, Shorts, feed posts",
    fills: [
      "Subject in upper 60%, audience-tuned vibe",
      "Saturated complementary palette",
      "Hook headline + CTA copy quoted in the prompt",
      "Lower third reserved for caption overlay",
    ],
    fields: [
      { id: "campaign_name", label: "Product / campaign", type: "text", placeholder: "WhatCampaign launch / Summer Sale", required: true },
      { id: "hook_headline", label: "Hook headline (3–6 words)", type: "text", placeholder: "Built for builders", required: true },
      { id: "sub_text", label: "Sub-text", type: "text", placeholder: "Launching June 24" },
      { id: "cta_copy", label: "CTA button copy", type: "text", placeholder: "Get early access", required: true },
      { id: "brand_color", label: "Brand colors", type: "text", placeholder: "deep blue #21449B + cyan #3B82F6" },
      {
        id: "audience_vibe",
        label: "Audience vibe",
        type: "select",
        options: ["—", "Gen Z", "Millennials", "Professionals", "Founders / Builders", "Parents", "Luxury buyers"],
      },
    ],
    subcategories: [
      {
        id: "ig-story",
        label: "Instagram Story / Reels",
        description: "Full-bleed vertical, central focal point, lower third for caption.",
        aspect_ratio: "9:16",
        style_tags_override: ["Vibrant", "Editorial", "Cinematic"],
        mood_tags_override: ["Energetic", "Confident"],
        idea_template: `A scroll-stopping Instagram Story / Reels visual for {{campaign_name}}{{?audience_vibe}} targeted at {{audience_vibe}}{{/audience_vibe}}. Subject occupies the upper 60% of the frame at an unexpected angle — foreshortened, low or overhead — so the eye snaps to it. Headline reads "{{hook_headline}}"{{?sub_text}} with sub-text "{{sub_text}}"{{/sub_text}}, placed above the focal point. CTA button at the bottom-center, glowing pill shape, label "{{cta_copy}}".{{?brand_color}} Bold complementary palette built around {{brand_color}}.{{/brand_color}} Subject optically sharp; periphery has slight motion blur for energy. Lower third quiet for caption overlay.`,
      },
      {
        id: "tiktok-vertical",
        label: "TikTok vertical",
        description: "Higher-contrast, even more aggressive composition for the For You feed.",
        aspect_ratio: "9:16",
        style_tags_override: ["Vibrant", "Cinematic"],
        mood_tags_override: ["Energetic", "Playful"],
        idea_template: `A high-energy TikTok-native vertical visual for {{campaign_name}}{{?audience_vibe}} ({{audience_vibe}} audience){{/audience_vibe}}. Hyper-saturated palette, hard light, exaggerated contrast. Subject dead-center with a tight 1.5x crop, motion-blur sweeps radiating outward. Headline "{{hook_headline}}" stamped in large geometric sans across the upper third, kerned tight.{{?sub_text}} Sub-text "{{sub_text}}" in smaller weight directly beneath.{{/sub_text}} CTA "{{cta_copy}}" sits in a glowing pill at the bottom.{{?brand_color}} Palette: {{brand_color}}, used aggressively.{{/brand_color}} Built for thumb-stop in under a second.`,
      },
      {
        id: "ig-feed",
        label: "Instagram feed (square)",
        description: "1:1 square — balanced focal point, copy-safe band along one edge.",
        aspect_ratio: "1:1",
        style_tags_override: ["Vibrant", "Editorial", "Minimalist"],
        mood_tags_override: ["Confident", "Premium"],
        idea_template: `A square Instagram feed post for {{campaign_name}}{{?audience_vibe}} ({{audience_vibe}} audience){{/audience_vibe}}. Subject placed on the rule-of-thirds intersection with deliberate copy-safe space along the left edge. Headline "{{hook_headline}}" stacks vertically in the negative space.{{?sub_text}} Sub-line "{{sub_text}}".{{/sub_text}} Small CTA pill near the bottom-right reading "{{cta_copy}}".{{?brand_color}} Palette: {{brand_color}}.{{/brand_color}} Strong central focal point, clean composition, balanced visual weight.`,
      },
      {
        id: "linkedin-feed",
        label: "LinkedIn feed",
        description: "Wider, more buttoned-up — professional audience aesthetics.",
        aspect_ratio: "16:9",
        style_tags_override: ["Editorial", "Minimalist", "Cinematic"],
        mood_tags_override: ["Trustworthy", "Confident", "Premium"],
        idea_template: `A LinkedIn feed visual for {{campaign_name}}{{?audience_vibe}}, speaking to {{audience_vibe}}{{/audience_vibe}}. Restrained, premium SaaS aesthetic — generous whitespace, soft directional light, muted gradient backdrop. Subject in the right two-thirds, copy-safe left third holds the headline "{{hook_headline}}"{{?sub_text}} and supporting sub-text "{{sub_text}}"{{/sub_text}}. CTA "{{cta_copy}}" rendered as a flat, low-shadow primary button.{{?brand_color}} Palette: {{brand_color}}.{{/brand_color}} Modern geometric sans typography (Inter or Söhne style). Trustworthy and high-signal, not flashy.`,
      },
      {
        id: "pinterest-pin",
        label: "Pinterest pin",
        description: "Tall vertical with strong typography and a save-worthy editorial feel.",
        aspect_ratio: "3:4",
        style_tags_override: ["Editorial", "Vibrant"],
        mood_tags_override: ["Aspirational", "Warm"],
        idea_template: `A Pinterest pin for {{campaign_name}}{{?audience_vibe}} aimed at {{audience_vibe}}{{/audience_vibe}}. Tall vertical composition with a magazine-style cover layout. Beautifully shot focal scene fills the upper two-thirds; lower third hosts the headline "{{hook_headline}}" in a serif-display typeface, large.{{?sub_text}} Sub-line "{{sub_text}}".{{/sub_text}} Small CTA reading "{{cta_copy}}" anchors the bottom edge.{{?brand_color}} Palette: {{brand_color}}, applied like an editorial color story.{{/brand_color}} Save-worthy, aspirational mood.`,
      },
    ],
    prefill: {
      idea: "A scroll-stopping vertical visual for [PRODUCT/SERVICE].",
      elements:
        "subject in upper 60% of frame, complementary saturated palette, radiating leading lines, clean lower third for overlay text",
      aspect_ratio: "9:16",
      style_tags: ["Vibrant", "Editorial", "Cinematic"],
      mood_tags: ["Energetic", "Confident"],
    },
  },

  // ============================================================
  // 3. Hero banner
  // ============================================================
  {
    id: "hero-banner",
    label: "Cinematic hero banner",
    icon: "🎨",
    description: "Wide, breathable, copy-safe homepage cover.",
    bestFor: "Homepage hero, landing page, email banner",
    fills: [
      "Aspect tuned to the placement (16:9, 3:1, 3:4)",
      "Off-center subject with copy-safe zone",
      "Soft directional light, brand palette",
      "Headline / sub-text / CTA quoted into the prompt",
    ],
    fields: [
      { id: "company_name", label: "Company name", type: "text", placeholder: "WhatCampaign", required: true },
      {
        id: "product_category",
        label: "Product category",
        type: "select",
        required: true,
        hint: "Picks the motif vocabulary — SaaS gets data viz, fintech gets number-heavy UI, consumer brand gets tactile materials.",
        options: [
          "Software / SaaS",
          "AI product",
          "Developer tool",
          "Fintech",
          "Healthcare / MedTech",
          "E-commerce store",
          "Mobile app",
          "Consumer brand",
          "B2B platform / ERP",
          "Service / agency",
          "Other",
        ],
      },
      { id: "value_descriptor", label: "What you do (one line)", type: "textarea", placeholder: "an AI-powered ad-ops platform for campaign planning, budget allocation, and multi-platform publishing", required: true },
      { id: "headline_copy", label: "Headline copy", type: "text", placeholder: "Campaign Planning, Simplified.", required: true, hint: "3–7 words ideal." },
      { id: "sub_text", label: "Sub-text", type: "text", placeholder: "All-in-one AI Ad-Ops platform — Launching June 24" },
      { id: "cta_copy", label: "CTA button copy", type: "text", placeholder: "Get Early Access", required: true },
      { id: "brand_primary", label: "Brand primary color", type: "text", placeholder: "deep royal blue #21449B", required: true },
      { id: "brand_accent", label: "Brand accent color", type: "text", placeholder: "electric cyan #3B82F6" },
      {
        id: "logo_placement",
        label: "Logo placement",
        type: "select",
        options: ["top-left", "top-center", "bottom-left", "none"],
      },
    ],
    field_value_snippets: {
      product_category__software_saas:
        "Motifs appropriate to a SaaS product: flowing data lines, node-network particles, soft glowing orbs, faint dashboard / chart UI fragments, and subtle glassmorphism cards showing key metrics floating in the composition. The aesthetic is clean tech-SaaS — minimal, premium, generous negative space.",
      product_category__ai_product:
        "Motifs appropriate to an AI product: neural-network particle scatter, soft glowing embedding-space gradients, a single in-progress streaming element (typing cursor / generating spinner) catching the light, and faint generative-art texture in the background. Aesthetic feels intelligent, slightly futuristic, and human-scale.",
      product_category__developer_tool:
        "Motifs appropriate to a developer tool: monospace code fragments floating in the composition, a clean terminal or editor UI fragment in soft focus, particle scatter representing data flow, and a dark-mode aesthetic with a single brand-colored accent on a key token. The vibe is craft, precision, and reverence for the craftsperson.",
      product_category__fintech:
        "Motifs appropriate to a fintech product: clean number-heavy UI cards, a chart with an upward sweep highlighted, subtle grid lines, and glassmorphism cards over a deep neutral background. Aesthetic reads premium, calm, trust-first — green or blue accents over deep neutrals, never flashy.",
      product_category__healthcare_medtech:
        "Motifs appropriate to a healthcare / MedTech product: clinical clarity, generous whitespace, soft directional light, a single device or UI fragment framed with surgical precision. Palette restrained — clinical white, brand color, one warm accent for humanity. Aesthetic reads trustworthy, calm, evidence-based.",
      product_category__e_commerce_store:
        "Motifs appropriate to an e-commerce store: a hero pack-shot or styled product in the right two-thirds, soft drop-shadow grounding, supporting product crops in soft focus around the edges. Aesthetic reads modern retail — confident, desirable, palette emphasizing the brand color over neutrals.",
      product_category__mobile_app:
        "Motifs appropriate to a mobile app: a 3D phone mock-up at a slight perspective with a soft device glow, the primary screen tack-sharp; two supporting screens fan out behind it in soft focus. Subtle floating UI fragments around the device hint at depth. Aesthetic reads modern, consumer-app-friendly.",
      product_category__consumer_brand:
        "Motifs appropriate to a consumer brand: tactile materials in soft focus (paper, ceramic, fabric, glass), natural directional light, generous negative space, organic forms over geometric. Aesthetic reads warm, lifestyle-leaning, considered.",
      product_category__b2b_platform_erp:
        "Motifs appropriate to an enterprise B2B / ERP platform: corporate-grade dashboard fragments, faint org-chart connectors, multi-row data tables, and executive KPI cards in soft glassmorphism. Aesthetic reads trustworthy, enterprise, premium — never consumer-flashy.",
      product_category__service_agency:
        "Motifs appropriate to a service or agency: a confident editorial portrait or signature artifact in the right two-thirds, surrounding cues that evoke craft and process without being literal. Aesthetic reads premium, considered, human — typography-first, restrained imagery.",
      product_category__other: "",
    },
    subcategories: [
      {
        id: "marketing-hero",
        label: "Marketing site hero",
        description: "Wide 16:9 homepage cover with copy-safe left third.",
        aspect_ratio: "16:9",
        style_tags_override: ["Cinematic", "Minimalist", "Editorial"],
        mood_tags_override: ["Trustworthy", "Premium", "Confident"],
        idea_template: `Design a sleek, modern marketing-site hero banner for {{company_name}}, {{value_descriptor}}. Visual theme: {{brand_primary}} as the dominant brand color, paired with crisp white{{?brand_accent}} and {{brand_accent}} for highlights and CTA elements{{/brand_accent}}. Minimal, premium, lots of negative space, soft gradient mesh in the background transitioning from {{brand_primary}} to a darker shade. {{=product_category}} Modern geometric sans-serif typography (Inter or Satoshi style).{{?logo_placement}} {{company_name}} logo placed {{logo_placement}}.{{/logo_placement}} Headline reads "{{headline_copy}}".{{?sub_text}} Sub-text reads "{{sub_text}}".{{/sub_text}} A glowing pill-shaped CTA button reading "{{cta_copy}}". Soft depth-of-field, professional and trustworthy mood. High-resolution, sharp, no clutter. 16:9 aspect.`,
      },
      {
        id: "landing-fold",
        label: "Landing page above-fold",
        description: "Same 16:9 but tighter, conversion-focused — CTA visually dominant.",
        aspect_ratio: "16:9",
        style_tags_override: ["Cinematic", "Minimalist"],
        mood_tags_override: ["Confident", "Premium"],
        idea_template: `A landing-page above-fold banner for {{company_name}}, {{value_descriptor}}. The CTA is the visual anchor — a large glowing pill button reading "{{cta_copy}}" sits at the optical center-right with a subtle bloom around it. Headline "{{headline_copy}}" appears directly above the CTA in modern geometric sans (Inter or Satoshi).{{?sub_text}} Sub-text "{{sub_text}}" sits between headline and CTA in a lighter weight.{{/sub_text}}{{?logo_placement}} {{company_name}} logo {{logo_placement}}.{{/logo_placement}} Background: smooth gradient mesh from {{brand_primary}} to a deeper shade{{?brand_accent}}, with {{brand_accent}} highlight wisps catching the headline{{/brand_accent}}. {{=product_category}} High-clarity, conversion-tuned, trustworthy mood.`,
      },
      {
        id: "mobile-hero",
        label: "Mobile-first hero",
        description: "Portrait 3:4 with stacked headline above a centered visual.",
        aspect_ratio: "3:4",
        style_tags_override: ["Cinematic", "Minimalist"],
        mood_tags_override: ["Trustworthy", "Confident"],
        idea_template: `A mobile-first hero visual for {{company_name}}, {{value_descriptor}}. Portrait composition with three vertical bands: top third holds {{?logo_placement}}{{company_name}} logo ({{logo_placement}}) and {{/logo_placement}}the headline "{{headline_copy}}" in modern geometric sans (Inter or Satoshi style);{{?sub_text}} the sub-text "{{sub_text}}" sits one weight lighter beneath{{/sub_text}}. Middle third: the centerpiece visual, resting on a soft gradient mesh from {{brand_primary}} to a deeper shade{{?brand_accent}}, with {{brand_accent}} highlights{{/brand_accent}}. {{=product_category}} Bottom third: a large glowing pill CTA reading "{{cta_copy}}". Generous negative space, premium mood.`,
      },
      {
        id: "email-banner",
        label: "Email banner header",
        description: "Wide 16:9 (renders well as 3:1 crop) for newsletter headers.",
        aspect_ratio: "16:9",
        style_tags_override: ["Minimalist", "Editorial"],
        mood_tags_override: ["Trustworthy", "Calm"],
        idea_template: `A clean email-header banner for {{company_name}}, {{value_descriptor}}. Ultra-restrained — single horizontal band, subject and copy both within the central safe zone (renders fine even when email clients hard-crop to 3:1). Headline "{{headline_copy}}" sits center-left in modern geometric sans (Inter or Satoshi).{{?sub_text}} Sub-text "{{sub_text}}" one line beneath in lighter weight.{{/sub_text}}{{?logo_placement}} {{company_name}} logo {{logo_placement}}.{{/logo_placement}} Background: gentle gradient from {{brand_primary}} to white{{?brand_accent}}, with a single {{brand_accent}} accent wisp{{/brand_accent}}. A small pill button reading "{{cta_copy}}" anchors the right. Calm, premium, low-noise.`,
      },
    ],
    prefill: {
      idea: "A wide, cinematic hero banner conveying [THE BIG IDEA].",
      elements:
        "off-center subject, copy-safe zone, soft directional light, 3-hue palette, shallow focus falloff",
      aspect_ratio: "16:9",
      style_tags: ["Cinematic", "Minimalist", "Editorial"],
      mood_tags: ["Trustworthy", "Calm", "Confident"],
    },
  },

  // ============================================================
  // 4. Mascot character
  // ============================================================
  {
    id: "mascot",
    label: "Brand mascot character",
    icon: "🦊",
    description: "Memorable character with a distinctive silhouette.",
    bestFor: "App icon, packaging, social avatar, stickers",
    fills: [
      "Silhouette-first design readable at thumbnail",
      "Brand-anchored palette + one pop accent",
      "Friendly geometry with personality cue",
      "Rendering style picked to fit the brand",
    ],
    fields: [
      { id: "brand_name", label: "Brand name", type: "text", placeholder: "WhatCampaign", required: true },
      { id: "character_type", label: "Character type", type: "text", placeholder: "fox / robot / cloud blob / owl", required: true },
      { id: "distinctive_feature", label: "Distinctive feature", type: "text", placeholder: "wearing a tiny chef's hat / holding a clipboard / glasses + tie", hint: "One small detail that makes it memorable." },
      {
        id: "personality",
        label: "Personality",
        type: "select",
        options: ["—", "friendly", "cheeky", "focused", "energetic", "calm", "wise"],
      },
      {
        id: "rendering_style",
        label: "Rendering style",
        type: "select",
        options: ["cel-shaded flat vector", "soft 3D render", "hand-painted gouache", "minimal line-art", "isometric 3D"],
      },
      { id: "brand_color", label: "Brand primary color", type: "text", placeholder: "deep royal blue #21449B" },
    ],
    subcategories: [
      {
        id: "icon-silhouette",
        label: "App icon / sticker silhouette",
        description: "Single-shape silhouette readable at 64px. Solid background.",
        aspect_ratio: "1:1",
        style_tags_override: ["Illustration", "Minimalist"],
        mood_tags_override: ["Playful", "Friendly"],
        idea_template: `A simplified app-icon silhouette of a {{character_type}} as the brand mascot for {{brand_name}}. Designed silhouette-first — the entire character must read instantly at 64×64 pixels. {{rendering_style}}.{{?personality}} Personality: {{personality}} — communicated through posture and proportions, not detail.{{/personality}}{{?distinctive_feature}} Distinctive feature: {{distinctive_feature}}, kept as a bold shape signature rather than fine detail.{{/distinctive_feature}}{{?brand_color}} Palette: {{brand_color}} dominant with one high-contrast pop accent and at most one supporting tone.{{/brand_color}} Solid background, single shape, generous breathing room.`,
      },
      {
        id: "portrait",
        label: "Three-quarter portrait",
        description: "Up-close character study — face + upper body, warm eye contact.",
        aspect_ratio: "1:1",
        style_tags_override: ["Illustration"],
        mood_tags_override: ["Friendly", "Warm"],
        idea_template: `A three-quarter portrait of a {{character_type}} brand mascot for {{brand_name}}. Pose: slight forward lean, warm eye contact, relaxed half-smile.{{?personality}} Personality reads as {{personality}} via expression and posture.{{/personality}}{{?distinctive_feature}} Wearing or holding: {{distinctive_feature}}.{{/distinctive_feature}} Rendering: {{rendering_style}}, clean line work, soft cel-shading.{{?brand_color}} Palette: {{brand_color}} dominant + 2 complementary accents + 1 high-contrast pop.{{/brand_color}} Soft gradient background, generous negative space, eye-level camera. Memorable, friendly, brand-aligned.`,
      },
      {
        id: "action-pose",
        label: "Full-body action pose",
        description: "Mid-stride / mid-gesture — character in motion, storytelling.",
        aspect_ratio: "3:4",
        style_tags_override: ["Illustration", "3D Render"],
        mood_tags_override: ["Energetic", "Playful"],
        idea_template: `A full-body action pose of a {{character_type}} brand mascot for {{brand_name}}, captured mid-gesture so the character feels alive — a stride forward, a confident point, a balanced leap. Rendering: {{rendering_style}}.{{?personality}} Personality cue: {{personality}}, expressed through dynamic line of action.{{/personality}}{{?distinctive_feature}} Distinctive feature: {{distinctive_feature}}, integrated into the pose (held, worn, or trailing).{{/distinctive_feature}}{{?brand_color}} Palette: {{brand_color}} as the dominant character color + 2 supporting hues + a single pop accent.{{/brand_color}} Soft directional light from upper-left, gentle ground shadow. Portrait 3:4 with breathing room above and below for narrative use.`,
      },
    ],
    prefill: {
      idea: "A friendly brand mascot character for [BRAND], silhouette-first.",
      elements:
        "silhouette-first design readable at 64px, soft rounded geometry, brand primary + 2 accents + 1 pop color, eye-level camera",
      aspect_ratio: "1:1",
      style_tags: ["Illustration", "3D Render"],
      mood_tags: ["Playful", "Friendly", "Warm"],
    },
  },

  // ============================================================
  // 5. Holiday / seasonal
  // ============================================================
  {
    id: "holiday",
    label: "Holiday / seasonal campaign",
    icon: "🎄",
    description: "Warm seasonal moment tied to the brand.",
    bestFor: "Email header, gift-card art, social hero, OOH",
    fills: [
      "One signature seasonal motif (not montage)",
      "Practical lights (candles / fairy lights) at ~2700K",
      "Copy-safe quiet zone for greeting",
      "Warm dominant palette + one cool accent",
    ],
    fields: [
      { id: "brand_name", label: "Brand name", type: "text", placeholder: "WhatCampaign", required: true },
      {
        id: "holiday",
        label: "Holiday",
        type: "select",
        required: true,
        options: [
          "Christmas",
          "Hanukkah",
          "Diwali",
          "Eid",
          "Lunar New Year",
          "Halloween",
          "Black Friday",
          "Valentine's Day",
          "Mother's Day",
          "Father's Day",
          "Thanksgiving",
          "New Year",
          "Custom",
        ],
      },
      { id: "custom_holiday", label: "Custom holiday name", type: "text", placeholder: "Brand birthday / Founder's Day", hint: "Only used if Holiday = Custom." },
      { id: "greeting_copy", label: "Greeting copy", type: "text", placeholder: "Happy Holidays from WhatCampaign" },
      { id: "hero_motif", label: "Hero motif", type: "text", placeholder: "single pine branch with brass ornament / lit menorah / clay diya", required: true, hint: "ONE signature object, not a montage." },
      { id: "brand_color", label: "Brand color", type: "text", placeholder: "deep royal blue #21449B" },
      { id: "cta_copy", label: "CTA (optional)", type: "text", placeholder: "Shop the collection" },
    ],
    subcategories: [
      {
        id: "email-header",
        label: "Email header",
        description: "Wide 4:3 — clean greeting + motif, copy-safe band.",
        aspect_ratio: "4:3",
        style_tags_override: ["Photoreal", "Editorial"],
        mood_tags_override: ["Warm", "Joyful"],
        idea_template: `A warm, intimate seasonal email-header visual for {{brand_name}} celebrating {{holiday}}{{?custom_holiday}} ({{custom_holiday}}){{/custom_holiday}}. Hero element: {{hero_motif}}, framed center-left with a clean copy-safe band along the right for greeting text.{{?greeting_copy}} Greeting copy reads "{{greeting_copy}}".{{/greeting_copy}} Practical lighting — candles, fairy lights, hearth glow at ~2700K — provides most of the illumination, with a soft cool fill from a window or off-frame source for separation.{{?brand_color}} Palette warm-dominant with a single {{brand_color}} accent appearing as a ribbon, wrapping, or candle.{{/brand_color}}{{?cta_copy}} Subtle CTA reading "{{cta_copy}}" rendered as a small pill in the lower-right.{{/cta_copy}} Tactile materials (linen, brushed brass, pine, wax) carry the warmth.`,
      },
      {
        id: "gift-card",
        label: "Gift-card art",
        description: "Portrait 3:4 — motif centered, room for a personal note.",
        aspect_ratio: "3:4",
        style_tags_override: ["Photoreal", "Minimalist"],
        mood_tags_override: ["Warm", "Premium"],
        idea_template: `A gift-card-ready portrait visual for {{brand_name}}'s {{holiday}}{{?custom_holiday}} ({{custom_holiday}}){{/custom_holiday}} campaign. Hero motif: {{hero_motif}}, photographed against a textured paper backdrop with a soft graphic shadow. The composition leaves a deliberate clean lower third for a hand-written note panel.{{?greeting_copy}} Tiny serif greeting at the top reads "{{greeting_copy}}".{{/greeting_copy}} Warm 2700K candle-quality lighting from camera-right, subtle cool fill from above.{{?brand_color}} Tasteful {{brand_color}} accent appears as a ribbon or wax seal.{{/brand_color}} Premium tactile feel — paper grain, brushed metal, soft wax.`,
      },
      {
        id: "social-hero",
        label: "Social hero",
        description: "Square 1:1 — motif large, greeting overlaid in cooler weight.",
        aspect_ratio: "1:1",
        style_tags_override: ["Photoreal", "Editorial", "Vibrant"],
        mood_tags_override: ["Joyful", "Warm"],
        idea_template: `A social-feed-ready square seasonal visual for {{brand_name}}'s {{holiday}}{{?custom_holiday}} ({{custom_holiday}}){{/custom_holiday}}. The {{hero_motif}} fills the frame at a slightly oversized scale, photographed up close so its texture and color sing. Practical warm lights (~2700K) creating cinematic bokeh in the background; gentle cool rim light separates the motif.{{?greeting_copy}} Greeting copy "{{greeting_copy}}" overlaid in elegant serif at the top in white.{{/greeting_copy}}{{?brand_color}} A {{brand_color}} note appears as wrapping or accent thread.{{/brand_color}}{{?cta_copy}} Small CTA pill "{{cta_copy}}" anchors the bottom-right.{{/cta_copy}} Tactile, joyous, premium.`,
      },
      {
        id: "ooh",
        label: "Out-of-home / OOH",
        description: "Wide 16:9 — landscape composition for billboards / large screens.",
        aspect_ratio: "16:9",
        style_tags_override: ["Photoreal", "Cinematic", "Editorial"],
        mood_tags_override: ["Warm", "Premium", "Joyful"],
        idea_template: `A wide cinematic OOH visual for {{brand_name}}'s {{holiday}}{{?custom_holiday}} ({{custom_holiday}}){{/custom_holiday}} campaign — built to read from across a street. Hero motif {{hero_motif}} sits in the right two-thirds, photographed with anamorphic compression and a tight focal plane. Left third is a clean negative-space zone for headline copy.{{?greeting_copy}} Headline reads "{{greeting_copy}}".{{/greeting_copy}} Practical 2700K lights bloom in the background creating large soft orbs of bokeh.{{?brand_color}} {{brand_color}} appears as a subtle color quotation — ribbon, candle wax, ornament.{{/brand_color}}{{?cta_copy}} Bottom-right anchors a small pill CTA "{{cta_copy}}".{{/cta_copy}} Warm dominant palette with a single cool accent for depth. High-resolution, sharp, immediately readable.`,
      },
    ],
    prefill: {
      idea: "A warm seasonal visual celebrating [HOLIDAY] tied back to the brand.",
      elements:
        "one signature seasonal motif (not montage), practical 2700K lights, copy-safe quiet zone, tactile materials",
      aspect_ratio: "4:3",
      style_tags: ["Photoreal", "Editorial", "Cinematic"],
      mood_tags: ["Warm", "Joyful", "Premium"],
    },
  },

  // ============================================================
  // 6. Lifestyle / editorial
  // ============================================================
  {
    id: "lifestyle",
    label: "Lifestyle / editorial",
    icon: "📸",
    description: "Aspirational candid scene with the product in real context.",
    bestFor: "About page, campaign launch, brand book",
    fills: [
      "Observational, slightly documentary framing",
      "Natural light tuned to time of day",
      "Setting that signals the target customer",
      "Faint film grain for editorial texture",
    ],
    fields: [
      { id: "brand_name", label: "Brand name", type: "text", placeholder: "WhatCampaign", required: true },
      { id: "product_or_service", label: "Product / service in frame", type: "text", placeholder: "the WhatCampaign dashboard on a laptop / a single ceramic mug", required: true },
      {
        id: "setting",
        label: "Setting",
        type: "select",
        required: true,
        options: ["urban street", "minimal home interior", "café / workspace", "outdoor nature", "studio backdrop"],
      },
      {
        id: "time_of_day",
        label: "Time of day / light",
        type: "select",
        required: true,
        options: ["golden hour", "blue hour", "overcast diffuse", "bright midday", "evening interior"],
      },
      {
        id: "subject_presence",
        label: "People in frame",
        type: "select",
        options: ["no people", "hands only", "candid subject (not facing camera)", "group scene"],
      },
      { id: "mood_descriptor", label: "Brand mood (2-3 words)", type: "text", placeholder: "calm, aspirational, considered" },
    ],
    subcategories: [
      {
        id: "about-hero",
        label: "About page hero",
        description: "Portrait 3:4 — quiet, characterful, conveys brand values.",
        aspect_ratio: "3:4",
        style_tags_override: ["Editorial", "Photoreal", "Cinematic"],
        mood_tags_override: ["Aspirational", "Warm", "Calm"],
        idea_template: `A portrait-orientation lifestyle photograph for {{brand_name}}'s About page, featuring {{product_or_service}} in an authentic {{setting}} environment. Framing: observational, slightly documentary — subject occupied with a real task, gaze directed past the camera rather than into it. Time of day / light: {{time_of_day}}; lighting concretely matches with appropriate Kelvin (golden hour ≈ 3200K warm, blue hour ≈ 7500K cool, overcast diffuse ≈ 6000K flat, midday ≈ 5500K, evening interior ≈ 2700K).{{?subject_presence}} People: {{subject_presence}}.{{/subject_presence}} Mid-distance environmental detail in soft focus, faint Portra-400-like film grain.{{?mood_descriptor}} Overall mood: {{mood_descriptor}}.{{/mood_descriptor}} The product is present and credible in the moment, not staged front-and-center.`,
      },
      {
        id: "campaign-launch",
        label: "Campaign launch (16:9)",
        description: "Wide cinematic frame for the campaign's hero shot.",
        aspect_ratio: "16:9",
        style_tags_override: ["Editorial", "Cinematic", "Photoreal"],
        mood_tags_override: ["Aspirational", "Confident"],
        idea_template: `A wide, cinematic campaign launch photograph for {{brand_name}} featuring {{product_or_service}} in a {{setting}} setting. Anamorphic feel — subject in the right two-thirds, environment opening up to its left for headline placement. {{time_of_day}} light with matching Kelvin (golden hour ≈ 3200K, blue hour ≈ 7500K, overcast ≈ 6000K, midday ≈ 5500K, evening ≈ 2700K) and a touch of atmospheric haze for depth.{{?subject_presence}} People: {{subject_presence}}, framed with documentary candor.{{/subject_presence}} Subject in tack-sharp focus, mid-distance environment in soft focus falloff, far background painterly.{{?mood_descriptor}} Mood: {{mood_descriptor}}.{{/mood_descriptor}} Faint film grain.`,
      },
      {
        id: "editorial-spread",
        label: "Editorial spread",
        description: "4:3 magazine layout — generous breathing room, copy-safe gutter.",
        aspect_ratio: "4:3",
        style_tags_override: ["Editorial", "Minimalist"],
        mood_tags_override: ["Premium", "Calm"],
        idea_template: `A 4:3 editorial-spread-style photograph for {{brand_name}} featuring {{product_or_service}} in a {{setting}}. Composition leaves a deliberate vertical gutter band along one edge for body copy. {{time_of_day}} natural light. {{?subject_presence}}People: {{subject_presence}}.{{/subject_presence}} Subject placed off-center on the rule-of-thirds; mid-distance environment in soft focus; faint film grain for editorial texture.{{?mood_descriptor}} Mood: {{mood_descriptor}}.{{/mood_descriptor}} Quiet, intentional, magazine-grade.`,
      },
      {
        id: "brand-book",
        label: "Brand book contextual",
        description: "Portrait 3:4 — multiple touch-points of the brand in everyday use.",
        aspect_ratio: "3:4",
        style_tags_override: ["Editorial", "Photoreal"],
        mood_tags_override: ["Warm", "Trustworthy"],
        idea_template: `A brand-book-style portrait photograph for {{brand_name}} that captures {{product_or_service}} woven into everyday life in a {{setting}}. Multiple subtle brand touch-points read across the frame without ever screaming. {{time_of_day}} light, lit naturally with matching Kelvin.{{?subject_presence}} People: {{subject_presence}}.{{/subject_presence}} Slight film grain, gentle mid-distance focus falloff.{{?mood_descriptor}} Mood: {{mood_descriptor}}.{{/mood_descriptor}} Documentary-feeling, never staged, conveys the brand's values through context rather than the logo.`,
      },
    ],
    prefill: {
      idea: "An aspirational lifestyle photograph featuring [PRODUCT/SERVICE] in authentic everyday context.",
      elements:
        "observational framing, natural window light, soft bounce fill, faint film grain, product integrated into a real task",
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
