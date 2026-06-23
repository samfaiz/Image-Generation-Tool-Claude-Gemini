"use client";

import { useState } from "react";
import type { ClarifyQuestion } from "@/lib/api";
import { Button, Card, TextInput } from "./ui";

export type ClarifyAnswers = Record<string, string>;

const CUSTOM = "__custom__";

export function ClarifyingQuestions({
  questions,
  onSubmit,
  onSkip,
  busy,
}: {
  questions: ClarifyQuestion[];
  onSubmit: (answers: ClarifyAnswers) => void;
  onSkip: () => void;
  busy?: boolean;
}) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [customs, setCustoms] = useState<Record<string, string>>({});

  function selectOption(qid: string, value: string) {
    setChoices((c) => ({ ...c, [qid]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const answers: ClarifyAnswers = {};
    for (const q of questions) {
      const choice = choices[q.id];
      if (!choice) continue;
      const value = choice === CUSTOM ? (customs[q.id] ?? "").trim() : choice;
      if (value) answers[q.id] = value;
    }
    onSubmit(answers);
  }

  const allAnswered = questions.every((q) => {
    const c = choices[q.id];
    if (!c) return false;
    if (c === CUSTOM) return (customs[q.id] ?? "").trim().length > 0;
    return true;
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="p-6">
        <h3 className="text-sm font-medium text-text mb-1">A few quick questions</h3>
        <p className="text-xs text-muted">Claude tailored these to your brief — answers go into the final prompt.</p>
      </Card>

      {questions.map((q, idx) => {
        const selected = choices[q.id];
        return (
          <Card key={q.id} className="p-6">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-xs text-muted">{idx + 1}.</span>
              <h4 className="text-sm text-text font-medium">{q.question}</h4>
            </div>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const active = selected === opt;
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => selectOption(q.id, opt)}
                    className={`w-full text-left rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                      active
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-line bg-elevated text-text hover:bg-elevated"
                    }`}
                  >
                    <span className="inline-block w-4 mr-2 text-xs">{active ? "●" : "○"}</span>
                    {opt}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => selectOption(q.id, CUSTOM)}
                className={`w-full text-left rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                  selected === CUSTOM
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line bg-elevated text-text hover:bg-elevated"
                }`}
              >
                <span className="inline-block w-4 mr-2 text-xs">{selected === CUSTOM ? "●" : "○"}</span>
                Custom answer…
              </button>
              {selected === CUSTOM && (
                <TextInput
                  autoFocus
                  value={customs[q.id] ?? ""}
                  onChange={(e) => setCustoms((c) => ({ ...c, [q.id]: e.target.value }))}
                  placeholder="Type your answer…"
                />
              )}
            </div>
          </Card>
        );
      })}

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <Button type="button" variant="outline" onClick={onSkip} disabled={busy}>
          Skip → Form
        </Button>
        <Button type="submit" loading={busy} disabled={!allAnswered}>
          Apply answers → Form
        </Button>
      </div>
    </form>
  );
}
