"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ApiKeyOnboarding } from "@/components/ApiKeyOnboarding";
import { Briefing, type BriefingDraft } from "@/components/Briefing";
import { ClarifyingQuestions, type ClarifyAnswers } from "@/components/ClarifyingQuestions";
import { IdeationForm } from "@/components/IdeationForm";
import { MarketReadCard } from "@/components/MarketReadCard";
import { PromptDetails } from "@/components/PromptDetails";
import { VariationsGrid } from "@/components/VariationsGrid";
import { WatermarkStudio } from "@/components/WatermarkStudio";
import {
  api,
  ApiError,
  type ClarifyQuestion,
  type CredentialStatus,
  type Generation,
  type IdeationInput,
  type MarketRead,
} from "@/lib/api";
import { Alert, Button, Card, Pill, Spinner } from "@/components/ui";

type Phase =
  | "loading"
  | "needkeys"
  | "briefing"
  | "clarifying"
  | "form"
  | "analyzing"
  | "prompting"
  | "generating"
  | "done";

const PIPELINE_STEPS = [
  { key: "analyzing", label: "Comparing market", icon: "🔍" },
  { key: "prompting", label: "Engineering prompt", icon: "✦" },
  { key: "generating", label: "Generating variations", icon: "◆" },
  { key: "done", label: "Studio", icon: "✓" },
] as const;
const PIPELINE_ORDER: Phase[] = ["analyzing", "prompting", "generating", "done"];

const VARIATIONS = 3;
const MARKET_VIEW_MS = 2000; // auto-continue after the market read appears

function StepIndicator({ phase }: { phase: Phase }) {
  const current = PIPELINE_ORDER.indexOf(phase);

  return (
    <div className="flex items-center gap-3 mb-6">
      {PIPELINE_STEPS.map((s, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <div key={s.key} className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 text-sm ${
                state === "active" ? "text-text" : state === "done" ? "text-success" : "text-muted"
              }`}
            >
              <span
                className={`grid place-items-center h-6 w-6 rounded-full text-xs border ${
                  state === "active"
                    ? "border-accent bg-accent/15 text-accent"
                    : state === "done"
                      ? "border-success/40 bg-success/10"
                      : "border-line"
                }`}
              >
                {state === "active" ? <Spinner className="h-3 w-3" /> : s.icon}
              </span>
              {s.label}
            </div>
            {i < PIPELINE_STEPS.length - 1 && <div className="w-8 h-px bg-line" />}
          </div>
        );
      })}
    </div>
  );
}

function BriefingStepIndicator({ phase }: { phase: Phase }) {
  const steps = [
    { key: "briefing", label: "Brief" },
    { key: "clarifying", label: "Refine" },
    { key: "form", label: "Review" },
  ];
  const order: Phase[] = ["briefing", "clarifying", "form"];
  const current = order.indexOf(phase);
  if (current < 0) return null;

  return (
    <div className="flex items-center gap-3 mb-6">
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <div key={s.key} className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 text-xs ${
                state === "active" ? "text-text" : state === "done" ? "text-success" : "text-muted"
              }`}
            >
              <span
                className={`grid place-items-center h-5 w-5 rounded-full text-[10px] border ${
                  state === "active"
                    ? "border-accent bg-accent/15 text-accent"
                    : state === "done"
                      ? "border-success/40 bg-success/10"
                      : "border-line"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && <div className="w-8 h-px bg-line" />}
          </div>
        );
      })}
    </div>
  );
}

function SkeletonLines({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-elevated animate-pulse"
          style={{ width: `${90 - i * 12}%` }}
        />
      ))}
    </div>
  );
}

function ImageSkeleton({ label }: { label: string }) {
  return (
    <div className="aspect-[9/16] max-h-[70vh] w-auto mx-auto rounded-lg bg-elevated animate-pulse grid place-items-center">
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

function buildFormInitial(
  draft: BriefingDraft,
  answers?: ClarifyAnswers,
  questions?: ClarifyQuestion[],
): Partial<IdeationInput> {
  const tagBits: string[] = [];
  if (draft.style_tags.length) tagBits.push(`style: ${draft.style_tags.join(", ")}`);
  if (draft.mood_tags.length) tagBits.push(`mood: ${draft.mood_tags.join(", ")}`);

  const answerBits: string[] = [];
  if (answers && questions) {
    for (const q of questions) {
      const a = answers[q.id];
      if (a) answerBits.push(`${q.question.replace(/\?$/, "")}: ${a}`);
    }
  }

  const elementParts = [draft.elements, tagBits.join(" · "), answerBits.join(" · ")]
    .map((s) => s?.trim())
    .filter((s): s is string => !!s && s.length > 0);

  return {
    idea: draft.idea,
    industry: draft.industry,
    competitors: draft.competitors,
    elements: elementParts.length ? elementParts.join(" · ") : undefined,
    aspect_ratio: draft.aspect_ratio ?? "9:16",
  };
}

export default function StudioPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [creds, setCreds] = useState<CredentialStatus | null>(null);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Briefing/clarify state.
  const [draft, setDraft] = useState<BriefingDraft | null>(null);
  const [questions, setQuestions] = useState<ClarifyQuestion[]>([]);
  const [formInitial, setFormInitial] = useState<Partial<IdeationInput> | undefined>(undefined);

  // Pipeline state.
  const [marketRead, setMarketRead] = useState<MarketRead | null>(null);
  const [pendingInput, setPendingInput] = useState<IdeationInput | null>(null);
  const [selectedVariant, setSelectedVariant] = useState(0);

  useEffect(() => {
    (async () => {
      let c: CredentialStatus | null = null;
      try {
        c = await api.getCredentials();
        setCreds(c);
      } catch {
        /* unauthenticated is handled by AppShell */
      }

      if (!c?.has_claude || !c?.has_gemini) {
        setPhase("needkeys");
        return;
      }

      const fromId = new URLSearchParams(window.location.search).get("from");
      if (fromId) {
        try {
          const g = await api.getGeneration(Number(fromId));
          setFormInitial({
            idea: g.idea,
            industry: g.industry,
            competitors: g.competitors,
            elements: g.elements ?? undefined,
            reference_url: g.reference_url ?? undefined,
            aspect_ratio: g.aspect_ratio,
          });
          setPhase("form");
          return;
        } catch {
          /* fall back to briefing */
        }
      }

      setPhase("briefing");
    })();
  }, []);

  function handleKeysSaved(status: CredentialStatus) {
    setCreds(status);
    if (status.has_claude && status.has_gemini) setPhase("briefing");
  }

  async function handleBriefingContinue(d: BriefingDraft, action: "clarify" | "skip") {
    setDraft(d);
    setError(null);
    if (action === "skip") {
      setFormInitial(buildFormInitial(d));
      setPhase("form");
      return;
    }
    setBusy(true);
    try {
      const { questions: qs } = await api.clarifyBrief({
        idea: d.idea,
        industry: d.industry || undefined,
        competitors: d.competitors || undefined,
        template: d.template,
        style_tags: d.style_tags,
        mood_tags: d.mood_tags,
        fields: d.fields, // KNOWN FACTS from structured briefing fields
      });
      setQuestions(qs);
      setPhase("clarifying");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn’t fetch clarifying questions.");
      setFormInitial(buildFormInitial(d));
      setPhase("form");
    } finally {
      setBusy(false);
    }
  }

  function handleAnswers(answers: ClarifyAnswers) {
    if (!draft) return;
    setFormInitial(buildFormInitial(draft, answers, questions));
    setPhase("form");
  }

  function handleClarifySkip() {
    if (!draft) return;
    setFormInitial(buildFormInitial(draft));
    setPhase("form");
  }

  async function runPipeline(input: IdeationInput) {
    setError(null);
    setPendingInput(input);
    setMarketRead(null);
    setGeneration(null);
    setSelectedVariant(0);

    // Step 1 — Market research
    setPhase("analyzing");
    let market: MarketRead | null = null;
    try {
      const res = await api.marketResearch({
        idea: input.idea,
        industry: input.industry,
        competitors: input.competitors,
        template: draft?.template,
        style_tags: draft?.style_tags,
        mood_tags: draft?.mood_tags,
      });
      market = res.market_read;
      setMarketRead(market);
    } catch (err) {
      // Don't block on market read — show a warning and continue without it.
      setError(
        err instanceof ApiError
          ? `Market research skipped: ${err.message}`
          : "Market research skipped.",
      );
    }

    // Brief pause so the user sees the market read.
    if (market) {
      await new Promise((r) => setTimeout(r, MARKET_VIEW_MS));
    }

    // Step 2 — Prompt engineering
    setPhase("prompting");
    let gen: Generation;
    try {
      gen = await api.createGeneration({ ...input, market_read: market ?? undefined });
      setGeneration(gen);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Prompt engineering failed.");
      setPhase("form");
      return;
    }

    // Step 3 — Image variations
    setPhase("generating");
    try {
      const done = await api.generateImage(gen.id, VARIATIONS);
      setGeneration(done);
      setPhase("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Image generation failed.");
    }
  }

  async function retryImages() {
    if (!generation) return;
    setError(null);
    setPhase("generating");
    try {
      const done = await api.generateImage(generation.id, VARIATIONS);
      setGeneration(done);
      setSelectedVariant(0);
      setPhase("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Image generation failed.");
    }
  }

  function reset() {
    setGeneration(null);
    setError(null);
    setDraft(null);
    setQuestions([]);
    setFormInitial(undefined);
    setMarketRead(null);
    setPendingInput(null);
    setSelectedVariant(0);
    setPhase("briefing");
  }

  return (
    <AppShell>
      {phase === "loading" && (
        <div className="flex justify-center py-20 text-muted">
          <Spinner />
        </div>
      )}

      {phase === "needkeys" && (
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-semibold text-text mb-1">Connect your AI keys</h1>
          <p className="text-muted text-sm mb-6">Add both keys to start generating.</p>
          <ApiKeyOnboarding status={creds} onSaved={handleKeysSaved} />
        </div>
      )}

      {phase === "briefing" && (
        <div className="max-w-3xl mx-auto">
          <BriefingStepIndicator phase={phase} />
          <Pill className="mb-3">Type it. Paint it.</Pill>
          <h1 className="text-3xl sm:text-4xl font-semibold text-text mb-2 font-display tracking-tight">
            Brief your <span className="text-accent">image</span>.
          </h1>
          <p className="text-muted text-sm mb-6 max-w-xl">
            Pick a starting point, add style — then let Claude ask the questions that sharpen your prompt.
          </p>
          {error && (
            <div className="mb-4">
              <Alert kind="error">{error}</Alert>
            </div>
          )}
          <Briefing initial={draft ?? undefined} onContinue={handleBriefingContinue} busy={busy} />
        </div>
      )}

      {phase === "clarifying" && (
        <div className="max-w-3xl mx-auto">
          <BriefingStepIndicator phase={phase} />
          <h1 className="text-2xl font-semibold text-text mb-1">Refine your brief</h1>
          <p className="text-muted text-sm mb-6">
            Claude read what you already filled in and tailored these questions to the gaps —
            no generic prompts about things you&apos;ve already specified.
          </p>
          {error && (
            <div className="mb-4">
              <Alert kind="error">{error}</Alert>
            </div>
          )}
          <ClarifyingQuestions
            questions={questions}
            onSubmit={handleAnswers}
            onSkip={handleClarifySkip}
            busy={busy}
          />
          <div className="mt-4">
            <Button variant="ghost" onClick={() => setPhase("briefing")}>
              ← Back to brief
            </Button>
          </div>
        </div>
      )}

      {phase === "form" && (
        <div className="max-w-3xl mx-auto">
          <BriefingStepIndicator phase={phase} />
          <h1 className="text-2xl font-semibold text-text mb-1">Review & generate</h1>
          <p className="text-muted text-sm mb-6">
            Tweak anything below — we&apos;ll research the market, engineer the prompt, and render 3 variations.
          </p>
          {error && (
            <div className="mb-4">
              <Alert kind="error">{error}</Alert>
            </div>
          )}
          <IdeationForm
            key={formInitial ? "prefill" : "blank"}
            initial={formInitial}
            onSubmit={runPipeline}
          />
          <div className="mt-4">
            <Button variant="ghost" onClick={() => setPhase("briefing")}>
              ← Back to brief
            </Button>
          </div>
        </div>
      )}

      {(phase === "analyzing" || phase === "prompting" || phase === "generating") && (
        <div className="max-w-5xl mx-auto">
          <StepIndicator phase={phase} />

          {/* Market read column appears as soon as it's available. */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {phase === "analyzing" && !marketRead && (
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-text mb-4">
                    Comparing the market…
                  </h3>
                  <p className="text-xs text-muted mb-4">
                    Claude is reading up on {pendingInput?.competitors || "your competitors"} via web search.
                  </p>
                  <SkeletonLines count={6} />
                </Card>
              )}
              {marketRead && <MarketReadCard market={marketRead} />}

              {phase !== "analyzing" && (
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-text mb-4">
                    {phase === "prompting" || !generation?.claude_json
                      ? "Engineering your prompt…"
                      : "Engineered prompt"}
                  </h3>
                  {phase === "prompting" || !generation?.claude_json ? (
                    <SkeletonLines count={6} />
                  ) : (
                    <PromptDetails json={generation.claude_json} />
                  )}
                </Card>
              )}
            </div>

            <Card className="p-4">
              <ImageSkeleton
                label={
                  phase === "analyzing"
                    ? "Waiting for the market read…"
                    : phase === "prompting"
                      ? "Waiting for the prompt…"
                      : "Painting your variations…"
                }
              />
            </Card>
          </div>

          {error && (
            <div className="mt-6 space-y-3">
              <Alert kind="error">{error}</Alert>
              <div className="flex gap-2">
                <Button onClick={retryImages}>Retry</Button>
                <Button variant="outline" onClick={reset}>
                  Start over
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "done" && generation && (
        <div className="max-w-6xl mx-auto">
          <StepIndicator phase={phase} />
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-text">Your images</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={retryImages}>
                Regenerate
              </Button>
              <Button variant="outline" onClick={reset}>
                New image
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <VariationsGrid
              urls={generation.image_urls}
              selected={selectedVariant}
              onSelect={setSelectedVariant}
            />
            {generation.image_urls[selectedVariant] && (
              <WatermarkStudio imageUrl={generation.image_urls[selectedVariant]} />
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            {generation.market_read && <MarketReadCard market={generation.market_read} />}
            {generation.claude_json && (
              <Card className="p-6">
                <h3 className="text-sm font-medium text-text mb-4">Prompt breakdown</h3>
                <PromptDetails json={generation.claude_json} />
              </Card>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
