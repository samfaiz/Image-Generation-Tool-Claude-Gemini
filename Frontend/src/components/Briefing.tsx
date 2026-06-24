"use client";

import { useState } from "react";
import {
  BRIEFING_TEMPLATES,
  MOOD_TAGS,
  STYLE_TAGS,
  composeIdea,
  type BriefingTemplate,
  type SubCategory,
  type TemplateField,
} from "@/lib/briefing-presets";
import { api, ApiError, type ConceptSuggestion } from "@/lib/api";
import { Alert, Button, Card, Field, TextArea, TextInput } from "./ui";
import { InspirationModal } from "./InspirationModal";

export type BriefingDraft = {
  idea: string;
  industry: string;
  competitors: string;
  elements?: string;
  aspect_ratio?: string;
  template?: string;
  /** Structured field values keyed by human label (e.g. "Brand primary color").
   *  Used by the clarifier so it skips questions about anything already filled. */
  fields?: Record<string, string>;
  style_tags: string[];
  mood_tags: string[];
};

type Action = "clarify" | "skip";

export function Briefing({
  onContinue,
  initial,
  busy,
}: {
  onContinue: (draft: BriefingDraft, action: Action) => void;
  initial?: Partial<BriefingDraft>;
  busy?: boolean;
}) {
  const [template, setTemplate] = useState<BriefingTemplate | null>(
    initial?.template
      ? BRIEFING_TEMPLATES.find((t) => t.id === initial.template) ?? null
      : null,
  );
  const [subcategory, setSubcategory] = useState<SubCategory | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [idea, setIdea] = useState(initial?.idea ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [competitors, setCompetitors] = useState(initial?.competitors ?? "");
  const [styleTags, setStyleTags] = useState<string[]>(initial?.style_tags ?? []);
  const [moodTags, setMoodTags] = useState<string[]>(initial?.mood_tags ?? []);
  const [inspireOpen, setInspireOpen] = useState(false);

  // Idea sync tracking — when the user has manually edited the idea text we
  // stop auto-recomposing from field changes until they explicitly re-sync.
  // `lastComposed` is the most recent auto-composed value; if `idea` still
  // equals it, we know the user hasn't typed since.
  const [lastComposed, setLastComposed] = useState<string | null>(null);
  const ideaIsSynced = lastComposed !== null && idea === lastComposed;

  // Optimize-idea state
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [improvements, setImprovements] = useState<string[] | null>(null);
  const [preOptimizeIdea, setPreOptimizeIdea] = useState<string | null>(null);

  // Competitor suggestion state
  const [suggestingCompetitors, setSuggestingCompetitors] = useState(false);
  const [competitorsError, setCompetitorsError] = useState<string | null>(null);

  async function suggestCompetitors() {
    if (!industry.trim()) {
      setCompetitorsError("Add an industry first — that's what Claude needs to find competitors.");
      return;
    }
    setSuggestingCompetitors(true);
    setCompetitorsError(null);
    try {
      // Build product_context from the structured fields (product/company name + what-it-is).
      const ctxParts: string[] = [];
      const productName =
        fieldValues["product_name"] ?? fieldValues["company_name"] ?? fieldValues["brand_name"];
      const productType =
        fieldValues["product_type"] ??
        fieldValues["value_descriptor"] ??
        fieldValues["product_or_service"];
      if (productName) ctxParts.push(productName);
      if (productType) ctxParts.push(productType);
      const productContext = ctxParts.join(" — ") || undefined;

      const { competitors: names } = await api.suggestCompetitors({
        industry: industry.trim(),
        product_context: productContext,
      });

      // Merge with whatever the user already typed (preserve manual entries, append new).
      const existing = competitors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const existingLower = new Set(existing.map((s) => s.toLowerCase()));
      const merged = [...existing];
      for (const n of names) {
        if (!existingLower.has(n.toLowerCase())) merged.push(n);
      }
      setCompetitors(merged.join(", "));
    } catch (err) {
      setCompetitorsError(
        err instanceof ApiError ? err.message : "Couldn't fetch competitor suggestions.",
      );
    } finally {
      setSuggestingCompetitors(false);
    }
  }

  async function optimizeIdea() {
    if (!idea.trim()) return;
    setOptimizing(true);
    setOptimizeError(null);
    setPreOptimizeIdea(idea);
    try {
      const res = await api.optimizeIdea({
        idea: idea.trim(),
        industry: industry.trim() || undefined,
        competitors: competitors.trim() || undefined,
        template: template?.label,
        subcategory: subcategory?.label,
        fields: Object.keys(fieldValues).length ? fieldValues : undefined,
      });
      setIdea(res.optimized_idea);
      setLastComposed(res.optimized_idea); // Treat the optimized version as the new synced baseline.
      setImprovements(res.improvements);
    } catch (err) {
      setOptimizeError(
        err instanceof ApiError ? err.message : "Couldn't optimize the idea.",
      );
      setPreOptimizeIdea(null);
    } finally {
      setOptimizing(false);
    }
  }

  function revertOptimize() {
    if (preOptimizeIdea === null) return;
    setIdea(preOptimizeIdea);
    setLastComposed(null);
    setImprovements(null);
    setPreOptimizeIdea(null);
  }

  function pickTemplate(t: BriefingTemplate) {
    setTemplate(t);
    setSubcategory(null);
    setFieldValues({});
    setLastComposed(null);
    if (!idea.trim()) setIdea(t.prefill.idea);
    if (!industry.trim() && t.prefill.industry) setIndustry(t.prefill.industry);
    setStyleTags((cur) => mergeUnique(cur, t.prefill.style_tags ?? []));
    setMoodTags((cur) => mergeUnique(cur, t.prefill.mood_tags ?? []));
  }

  function pickSubcategory(sub: SubCategory) {
    setSubcategory(sub);
    if (sub.style_tags_override) setStyleTags(sub.style_tags_override);
    if (sub.mood_tags_override) setMoodTags(sub.mood_tags_override);
    const composed = composeIdea(sub.idea_template, fieldValues, template?.field_value_snippets);
    if (composed) {
      setIdea(composed);
      setLastComposed(composed);
    }
  }

  function setField(id: string, v: string) {
    const next = { ...fieldValues, [id]: v };
    setFieldValues(next);
    if (subcategory && ideaIsSynced) {
      const composed = composeIdea(subcategory.idea_template, next, template?.field_value_snippets);
      setIdea(composed);
      setLastComposed(composed);
    }
  }

  function resyncIdea() {
    if (!subcategory) return;
    const composed = composeIdea(subcategory.idea_template, fieldValues, template?.field_value_snippets);
    setIdea(composed);
    setLastComposed(composed);
  }

  function applySuggestion(s: ConceptSuggestion) {
    const t = BRIEFING_TEMPLATES.find((tpl) => tpl.id === s.template_id) ?? null;
    setTemplate(t);
    setSubcategory(null);
    setFieldValues({});
    setLastComposed(null);
    setIdea(s.idea);
    setStyleTags(s.style_tags);
    setMoodTags(s.mood_tags);
    setInspireOpen(false);
  }

  function toggleTag(set: string[], tag: string, setter: (v: string[]) => void) {
    setter(set.includes(tag) ? set.filter((t) => t !== tag) : [...set, tag]);
  }

  function handle(action: Action, e: React.FormEvent) {
    e.preventDefault();

    // Build a label-keyed map of filled structured fields so the clarifier can
    // read them as KNOWN FACTS and skip redundant questions. Drop empty values
    // and the "—" select sentinel.
    const labeledFields: Record<string, string> = {};
    if (template) {
      for (const f of template.fields) {
        const v = (fieldValues[f.id] ?? "").trim();
        if (v && v !== "—") labeledFields[f.label] = v;
      }
    }

    onContinue(
      {
        idea: idea.trim(),
        industry: industry.trim(),
        competitors: competitors.trim(),
        elements: template?.prefill.elements,
        aspect_ratio: subcategory?.aspect_ratio ?? template?.prefill.aspect_ratio,
        template: subcategory ? `${template?.label} — ${subcategory.label}` : template?.label,
        fields: Object.keys(labeledFields).length ? labeledFields : undefined,
        style_tags: styleTags,
        mood_tags: moodTags,
      },
      action,
    );
  }

  const canContinue =
    idea.trim().length > 0 && industry.trim().length > 0 && competitors.trim().length > 0;

  // Required-field gating: if a template is picked, any field marked required
  // must be filled before the form can submit (so Claude has real data, not
  // [PLACEHOLDERS]).
  const missingRequiredFields = template
    ? template.fields.filter((f) => f.required && !(fieldValues[f.id] ?? "").trim())
    : [];
  const canSubmit = canContinue && missingRequiredFields.length === 0;

  return (
    <>
      <form onSubmit={(e) => handle("clarify", e)} className="space-y-6">
        {/* ============== Template gallery ============== */}
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h3 className="text-sm font-medium text-text">Start with a template</h3>
              <p className="text-xs text-muted mt-0.5">
                Each one is a production-grade shot brief. Pick a variant + fill the fields.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInspireOpen(true)}
              className="shrink-0 whitespace-nowrap"
            >
              ✨ No idea yet?
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {BRIEFING_TEMPLATES.map((t) => {
              const active = template?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTemplate(t)}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    active ? "border-accent bg-accent/10" : "border-line bg-elevated hover:bg-elevated"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg leading-none">{t.icon}</span>
                    <span className="text-sm text-text font-medium">{t.label}</span>
                  </div>
                  <span className="text-xs text-muted block leading-snug mb-2">{t.description}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted block">
                    Best for: <span className="text-text/85 normal-case tracking-normal">{t.bestFor}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ============== Sub-category picker ============== */}
        {template && (
          <Card className="p-6">
            <h3 className="text-sm font-medium text-text mb-1">
              Pick a variant — {template.label}
            </h3>
            <p className="text-xs text-muted mb-4">
              Each variant locks in aspect ratio, composition, and style tuned for the placement.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {template.subcategories.map((sub) => {
                const active = subcategory?.id === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => pickSubcategory(sub)}
                    className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                      active ? "border-accent bg-accent/10" : "border-line bg-elevated hover:bg-elevated"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm text-text font-medium">{sub.label}</span>
                      <span className="text-[10px] uppercase tracking-wider text-accent shrink-0">
                        {sub.aspect_ratio}
                      </span>
                    </div>
                    <span className="text-xs text-muted block leading-snug">{sub.description}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* ============== Structured fields ============== */}
        {template && (
          <Card className="p-6">
            <h3 className="text-sm font-medium text-text mb-1">Fill the brief details</h3>
            <p className="text-xs text-muted mb-4">
              These replace the [PLACEHOLDERS] — fill them in and Claude gets real data to work with.
            </p>
            <FieldsPanel fields={template.fields} values={fieldValues} onChange={setField} />
          </Card>
        )}

        {/* ============== Idea (auto-composed) + Industry / Competitors ============== */}
        <Card className="p-6 space-y-5">
          <Field
            label="Idea"
            required
            hint={
              subcategory
                ? ideaIsSynced
                  ? "Auto-composed from your fields above — edit freely."
                  : "You've edited this manually. Field changes won't overwrite — click Re-sync to rebuild."
                : "The core concept. Pick a template + variant to auto-compose this from structured fields."
            }
          >
            <TextArea
              rows={6}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              required
              placeholder="A bold launch visual…"
            />
            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              {subcategory && !ideaIsSynced && (
                <Button type="button" variant="ghost" onClick={resyncIdea}>
                  ↻ Re-sync from fields
                </Button>
              )}
              {preOptimizeIdea !== null && !optimizing && (
                <Button type="button" variant="ghost" onClick={revertOptimize}>
                  ⤺ Revert
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={optimizeIdea}
                loading={optimizing}
                disabled={!idea.trim()}
              >
                ✨ Optimize for better results
              </Button>
            </div>
            {optimizeError && (
              <div className="mt-2">
                <Alert kind="error">{optimizeError}</Alert>
              </div>
            )}
            {improvements && improvements.length > 0 && !optimizeError && (
              <div className="mt-3 rounded-lg border border-success/30 bg-success/10 px-3.5 py-2.5">
                <div className="text-xs uppercase tracking-wider text-success mb-1.5">
                  Optimized — what Claude improved
                </div>
                <ul className="space-y-1">
                  {improvements.map((tip, i) => (
                    <li key={i} className="text-xs text-text/85 flex items-start gap-2">
                      <span className="mt-1 inline-block h-1 w-1 rounded-full bg-success" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Field / Industry" required>
              <TextInput
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
                placeholder="Beverages / MarTech / SaaS"
              />
            </Field>
            <Field
              label="Competitor names"
              required
              hint={
                competitorsError
                  ? undefined
                  : "Comma-separated — we'll differentiate from them. Or click ✨ to let Claude suggest based on the industry."
              }
              error={competitorsError ?? undefined}
            >
              <div className="flex gap-2">
                <TextInput
                  value={competitors}
                  onChange={(e) => {
                    setCompetitors(e.target.value);
                    if (competitorsError) setCompetitorsError(null);
                  }}
                  required
                  placeholder="Brand A, Brand B  —  or click ✨ Suggest"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={suggestCompetitors}
                  loading={suggestingCompetitors}
                  disabled={!industry.trim()}
                  className="shrink-0"
                  title={industry.trim() ? "Suggest competitors from the industry" : "Add an industry first"}
                >
                  ✨ Suggest
                </Button>
              </div>
            </Field>
          </div>
        </Card>

        {/* ============== Style + Mood ============== */}
        <Card className="p-6 space-y-5">
          <div>
            <h3 className="text-sm font-medium text-text mb-1">Style</h3>
            <p className="text-xs text-muted mb-3">Optional — pick any that fit your direction.</p>
            <TagRow tags={STYLE_TAGS} selected={styleTags} onToggle={(t) => toggleTag(styleTags, t, setStyleTags)} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-text mb-1">Mood</h3>
            <TagRow tags={MOOD_TAGS} selected={moodTags} onToggle={(t) => toggleTag(moodTags, t, setMoodTags)} />
          </div>
        </Card>

        {/* ============== Submit ============== */}
        {missingRequiredFields.length > 0 && template && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 text-danger text-xs px-3.5 py-2.5">
            Missing required {missingRequiredFields.length === 1 ? "field" : "fields"}:{" "}
            {missingRequiredFields.map((f) => f.label).join(", ")}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => handle("skip", e)}
            disabled={!canSubmit || busy}
          >
            Skip questions → Form
          </Button>
          <Button type="submit" loading={busy} disabled={!canSubmit}>
            Ask me clarifying questions →
          </Button>
        </div>
      </form>

      <InspirationModal
        open={inspireOpen}
        onClose={() => setInspireOpen(false)}
        onPick={applySuggestion}
      />
    </>
  );
}

// ---------------------------------------------------------------------------

function FieldsPanel({
  fields,
  values,
  onChange,
}: {
  fields: TemplateField[];
  values: Record<string, string>;
  onChange: (id: string, v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map((f) => (
        <div key={f.id} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
          <Field label={f.label} required={f.required} hint={f.hint}>
            {f.type === "textarea" && (
              <TextArea
                rows={2}
                value={values[f.id] ?? ""}
                onChange={(e) => onChange(f.id, e.target.value)}
                placeholder={f.placeholder}
                required={f.required}
              />
            )}
            {f.type === "text" && (
              <TextInput
                value={values[f.id] ?? ""}
                onChange={(e) => onChange(f.id, e.target.value)}
                placeholder={f.placeholder}
                required={f.required}
              />
            )}
            {f.type === "select" && (
              <select
                value={values[f.id] ?? ""}
                onChange={(e) => onChange(f.id, e.target.value)}
                required={f.required}
                className="w-full bg-elevated border border-line rounded-lg px-3.5 py-2.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 transition-colors"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {f.options?.map((opt) => (
                  <option key={opt} value={opt} className="bg-panel">
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      ))}
    </div>
  );
}

function TagRow({
  tags,
  selected,
  onToggle,
}: {
  tags: readonly string[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => {
        const active = selected.includes(t);
        return (
          <button
            key={t}
            type="button"
            onClick={() => onToggle(t)}
            className={`text-xs rounded-full border px-3 py-1.5 transition-colors ${
              active
                ? "border-accent bg-accent/15 text-accent"
                : "border-line bg-elevated text-text/85 hover:bg-elevated"
            }`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

function mergeUnique(a: string[], b: string[]): string[] {
  const seen = new Set(a);
  const out = [...a];
  for (const x of b) {
    if (!seen.has(x)) {
      out.push(x);
      seen.add(x);
    }
  }
  return out;
}
