"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type ConceptSuggestion } from "@/lib/api";
import { Alert, Button, Field, Spinner, TextArea, TextInput } from "./ui";

type Phase = "input" | "loading" | "picking";

export function InspirationModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (suggestion: ConceptSuggestion) => void;
}) {
  const [phase, setPhase] = useState<Phase>("input");
  const [companyName, setCompanyName] = useState("");
  const [whatCompanyDoes, setWhatCompanyDoes] = useState("");
  const [industry, setIndustry] = useState("");
  const [suggestions, setSuggestions] = useState<ConceptSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPhase("loading");
    try {
      const { suggestions: s } = await api.inspire({
        company_name: companyName.trim(),
        what_company_does: whatCompanyDoes.trim(),
        industry: industry.trim() || undefined,
      });
      setSuggestions(s);
      setPhase("picking");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn’t fetch suggestions.");
      setPhase("input");
    }
  }

  function reset() {
    setPhase("input");
    setSuggestions([]);
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-panel border border-line rounded-xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div>
            <h2 className="text-lg font-semibold text-text">Get AI inspiration</h2>
            <p className="text-xs text-muted">
              Tell us about your company — Claude will research the market and suggest 4 concrete ideas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-md text-muted hover:text-text hover:bg-elevated"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {phase === "input" && (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && <Alert kind="error">{error}</Alert>}
            <Field label="Company name" required>
              <TextInput
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="WhatCampaign"
                required
                autoFocus
              />
            </Field>
            <Field
              label="What does the company do?"
              required
              hint="1–3 sentences. The more concrete, the better the suggestions."
            >
              <TextArea
                rows={3}
                value={whatCompanyDoes}
                onChange={(e) => setWhatCompanyDoes(e.target.value)}
                placeholder="An AI-powered ad-ops platform that automates campaign planning, budget allocation, and multi-platform publishing for performance marketers."
                required
              />
            </Field>
            <Field label="Industry" hint="Optional — helps Claude scope the research.">
              <TextInput
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="MarTech / Ad Tech"
              />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Get 4 suggestions →</Button>
            </div>
          </form>
        )}

        {phase === "loading" && (
          <div className="p-12 grid place-items-center text-center">
            <Spinner className="h-8 w-8 text-accent" />
            <p className="text-sm text-text mt-4">Researching {companyName}…</p>
            <p className="text-xs text-muted mt-1">
              Claude is checking the company and category via web search. Usually 10–20 seconds.
            </p>
          </div>
        )}

        {phase === "picking" && (
          <div className="p-6 space-y-4">
            <p className="text-xs text-muted">
              Pick a concept to use as your starting brief. You can still edit everything.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onPick(s)}
                  className="text-left rounded-lg border border-line bg-elevated hover:border-accent hover:bg-accent/5 transition-colors p-4 group"
                >
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted">#{i + 1}</span>
                    <span className="text-sm text-text font-medium group-hover:text-text">
                      {s.title}
                    </span>
                  </div>
                  <p className="text-xs text-text/85 leading-relaxed mb-3">{s.hook}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Tag>{templateLabel(s.template_id)}</Tag>
                    <Tag muted>{s.aspect_ratio}</Tag>
                    {s.style_tags.slice(0, 2).map((t) => (
                      <Tag key={t} muted>
                        {t}
                      </Tag>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={reset}>
                ← Try a different brief
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tag({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={`text-[10px] rounded-full px-2 py-0.5 ${
        muted
          ? "bg-elevated border border-line text-muted"
          : "bg-accent/15 border border-accent/40 text-accent-hover"
      }`}
    >
      {children}
    </span>
  );
}

function templateLabel(id: string): string {
  const map: Record<string, string> = {
    "product-launch": "Product launch",
    "social-ad": "Social ad",
    "hero-banner": "Hero banner",
    mascot: "Mascot",
    holiday: "Holiday",
    lifestyle: "Lifestyle",
  };
  return map[id] ?? id;
}
