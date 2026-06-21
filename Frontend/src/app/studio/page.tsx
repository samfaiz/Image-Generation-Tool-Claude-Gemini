"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ApiKeyOnboarding } from "@/components/ApiKeyOnboarding";
import { IdeationForm } from "@/components/IdeationForm";
import { PromptDetails } from "@/components/PromptDetails";
import { WatermarkStudio } from "@/components/WatermarkStudio";
import {
  api,
  ApiError,
  type CredentialStatus,
  type Generation,
  type IdeationInput,
} from "@/lib/api";
import { Alert, Button, Card, Spinner } from "@/components/ui";

type Phase = "loading" | "needkeys" | "form" | "prompting" | "generating" | "done";

function StepIndicator({ phase }: { phase: Phase }) {
  const steps = [
    { key: "prompting", label: "Engineering prompt", icon: "✦" },
    { key: "generating", label: "Generating image", icon: "◆" },
    { key: "done", label: "Studio", icon: "✓" },
  ];
  const order: Phase[] = ["prompting", "generating", "done"];
  const current = order.indexOf(phase);

  return (
    <div className="flex items-center gap-3 mb-6">
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <div key={s.key} className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 text-sm ${
                state === "active" ? "text-white" : state === "done" ? "text-success" : "text-muted"
              }`}
            >
              <span
                className={`grid place-items-center h-6 w-6 rounded-full text-xs border ${
                  state === "active"
                    ? "border-accent bg-accent/15 text-white"
                    : state === "done"
                      ? "border-success/40 bg-success/10"
                      : "border-line"
                }`}
              >
                {state === "active" ? <Spinner className="h-3 w-3" /> : s.icon}
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

function ImageSkeleton() {
  return (
    <div className="aspect-[9/16] max-h-[70vh] w-auto mx-auto rounded-lg bg-elevated animate-pulse grid place-items-center">
      <span className="text-xs text-muted">Painting your image…</span>
    </div>
  );
}

export default function StudioPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [creds, setCreds] = useState<CredentialStatus | null>(null);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [initial, setInitial] = useState<Partial<IdeationInput> | undefined>(undefined);

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

      // Prefill the form from a previous generation (?from=<id>) — "reuse inputs".
      const fromId = new URLSearchParams(window.location.search).get("from");
      if (fromId) {
        try {
          const g = await api.getGeneration(Number(fromId));
          setInitial({
            idea: g.idea,
            industry: g.industry,
            competitors: g.competitors,
            elements: g.elements ?? undefined,
            reference_url: g.reference_url ?? undefined,
            aspect_ratio: g.aspect_ratio,
          });
        } catch {
          /* fall back to a blank form */
        }
      }

      setPhase("form");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleKeysSaved(status: CredentialStatus) {
    setCreds(status);
    if (status.has_claude && status.has_gemini) setPhase("form");
  }

  async function runPipeline(input: IdeationInput) {
    setError(null);
    setPhase("prompting");
    let gen: Generation;
    try {
      gen = await api.createGeneration(input); // Phase 1 — Claude
      setGeneration(gen);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Prompt engineering failed.");
      setPhase("form");
      return;
    }

    setPhase("generating");
    try {
      const done = await api.generateImage(gen.id); // Phase 2 — Gemini
      setGeneration(done);
      setPhase("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Image generation failed.");
      // Keep the engineered prompt available for a retry.
    }
  }

  async function retryImage() {
    if (!generation) return;
    setError(null);
    setPhase("generating");
    try {
      const done = await api.generateImage(generation.id);
      setGeneration(done);
      setPhase("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Image generation failed.");
    }
  }

  function reset() {
    setGeneration(null);
    setError(null);
    setPhase("form");
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
          <h1 className="text-2xl font-semibold text-neutral-100 mb-1">Connect your AI keys</h1>
          <p className="text-muted text-sm mb-6">Add both keys to start generating.</p>
          <ApiKeyOnboarding status={creds} onSaved={handleKeysSaved} />
        </div>
      )}

      {phase === "form" && (
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold text-neutral-100 mb-1">New image</h1>
          <p className="text-muted text-sm mb-6">Describe your concept — Claude will engineer the prompt.</p>
          {error && (
            <div className="mb-4">
              <Alert kind="error">{error}</Alert>
            </div>
          )}
          <IdeationForm key={initial ? "prefill" : "blank"} initial={initial} onSubmit={runPipeline} />
        </div>
      )}

      {(phase === "prompting" || phase === "generating") && (
        <div className="max-w-4xl mx-auto">
          <StepIndicator phase={phase} />
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-sm font-medium text-neutral-100 mb-4">
                {phase === "prompting" ? "Engineering your prompt…" : "Engineered prompt"}
              </h3>
              {phase === "prompting" || !generation?.claude_json ? (
                <SkeletonLines count={6} />
              ) : (
                <PromptDetails json={generation.claude_json} />
              )}
            </Card>
            <Card className="p-4">
              <ImageSkeleton />
            </Card>
          </div>
          {error && (
            <div className="mt-6 space-y-3">
              <Alert kind="error">{error}</Alert>
              <div className="flex gap-2">
                <Button onClick={retryImage}>Retry image</Button>
                <Button variant="outline" onClick={reset}>
                  Start over
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "done" && generation?.image_url && (
        <div className="max-w-5xl mx-auto">
          <StepIndicator phase={phase} />
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-neutral-100">Your image</h1>
            <Button variant="outline" onClick={reset}>
              New image
            </Button>
          </div>
          <WatermarkStudio imageUrl={generation.image_url} />
          {generation.claude_json && (
            <Card className="p-6 mt-6">
              <h3 className="text-sm font-medium text-neutral-100 mb-4">Prompt breakdown</h3>
              <PromptDetails json={generation.claude_json} />
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
