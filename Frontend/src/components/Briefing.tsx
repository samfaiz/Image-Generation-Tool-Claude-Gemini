"use client";

import { useState } from "react";
import {
  BRIEFING_TEMPLATES,
  MOOD_TAGS,
  STYLE_TAGS,
  type BriefingTemplate,
} from "@/lib/briefing-presets";
import type { ConceptSuggestion } from "@/lib/api";
import { Button, Card, Field, TextArea, TextInput } from "./ui";
import { InspirationModal } from "./InspirationModal";

export type BriefingDraft = {
  idea: string;
  industry: string;
  competitors: string;
  elements?: string;
  aspect_ratio?: string;
  template?: string;
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
  const [idea, setIdea] = useState(initial?.idea ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [competitors, setCompetitors] = useState(initial?.competitors ?? "");
  const [styleTags, setStyleTags] = useState<string[]>(initial?.style_tags ?? []);
  const [moodTags, setMoodTags] = useState<string[]>(initial?.mood_tags ?? []);
  const [inspireOpen, setInspireOpen] = useState(false);
  const [elementsOverride, setElementsOverride] = useState<string | undefined>(undefined);
  const [aspectRatioOverride, setAspectRatioOverride] = useState<string | undefined>(undefined);

  function pickTemplate(t: BriefingTemplate) {
    setTemplate(t);
    if (!idea.trim()) setIdea(t.prefill.idea);
    if (!industry.trim() && t.prefill.industry) setIndustry(t.prefill.industry);
    setStyleTags((cur) => mergeUnique(cur, t.prefill.style_tags ?? []));
    setMoodTags((cur) => mergeUnique(cur, t.prefill.mood_tags ?? []));
    setElementsOverride(undefined);
    setAspectRatioOverride(undefined);
  }

  function applySuggestion(s: ConceptSuggestion) {
    const t = BRIEFING_TEMPLATES.find((tpl) => tpl.id === s.template_id) ?? null;
    setTemplate(t);
    setIdea(s.idea);
    setStyleTags(s.style_tags);
    setMoodTags(s.mood_tags);
    setElementsOverride(s.elements || t?.prefill.elements);
    setAspectRatioOverride(s.aspect_ratio || t?.prefill.aspect_ratio);
    setInspireOpen(false);
  }

  function toggleTag(set: string[], tag: string, setter: (v: string[]) => void) {
    setter(set.includes(tag) ? set.filter((t) => t !== tag) : [...set, tag]);
  }

  function handle(action: Action, e: React.FormEvent) {
    e.preventDefault();
    onContinue(
      {
        idea: idea.trim(),
        industry: industry.trim(),
        competitors: competitors.trim(),
        elements: elementsOverride ?? template?.prefill.elements,
        aspect_ratio: aspectRatioOverride ?? template?.prefill.aspect_ratio,
        template: template?.label,
        style_tags: styleTags,
        mood_tags: moodTags,
      },
      action,
    );
  }

  const canContinue = idea.trim().length > 0 && industry.trim().length > 0 && competitors.trim().length > 0;

  return (
    <>
    <form onSubmit={(e) => handle("clarify", e)} className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h3 className="text-sm font-medium text-text">Start with a template</h3>
            <p className="text-xs text-muted mt-0.5">
              Each one is a production-grade shot brief — lighting, composition, and palette already specified.
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
        <div className="mt-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {BRIEFING_TEMPLATES.map((t) => {
            const active = template?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => pickTemplate(t)}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  active
                    ? "border-accent bg-accent/10"
                    : "border-line bg-elevated hover:bg-elevated"
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

        {template && (
          <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
            <div className="text-xs uppercase tracking-wider text-accent-hover mb-2">
              {template.icon} {template.label} — what gets pre-filled
            </div>
            <ul className="space-y-1">
              {template.fills.map((f, i) => (
                <li key={i} className="text-xs text-text/85 flex items-start gap-2">
                  <span className="mt-1 inline-block h-1 w-1 rounded-full bg-accent" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 text-[11px] text-muted">
              Edit anything below — placeholders like [PRODUCT] are meant to be replaced.
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-5">
        <Field label="Idea" required hint="The core concept. Replace any [PLACEHOLDERS] from the template.">
          <TextArea
            rows={3}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            required
            placeholder="A bold launch visual for our new cold-brew can…"
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Field / Industry" required>
            <TextInput
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              required
              placeholder="Beverages"
            />
          </Field>
          <Field label="Competitor names" required hint="Comma-separated — we&apos;ll differentiate from them.">
            <TextInput
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              required
              placeholder="Brand A, Brand B"
            />
          </Field>
        </div>
      </Card>

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

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={(e) => handle("skip", e)}
          disabled={!canContinue || busy}
        >
          Skip questions → Form
        </Button>
        <Button type="submit" loading={busy} disabled={!canContinue}>
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
