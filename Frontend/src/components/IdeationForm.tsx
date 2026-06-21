"use client";

import { useRef, useState } from "react";
import type { IdeationInput } from "@/lib/api";
import { Button, Card, Field, TextArea, TextInput } from "./ui";

const ASPECT_RATIOS = [
  { value: "9:16", label: "9:16 · Vertical (default)" },
  { value: "1:1", label: "1:1 · Square" },
  { value: "4:3", label: "4:3 · Landscape" },
  { value: "3:4", label: "3:4 · Portrait" },
  { value: "16:9", label: "16:9 · Wide" },
];

export function IdeationForm({
  onSubmit,
  disabled,
  initial,
}: {
  onSubmit: (input: IdeationInput) => void;
  disabled?: boolean;
  initial?: Partial<IdeationInput>;
}) {
  const [idea, setIdea] = useState(initial?.idea ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [competitors, setCompetitors] = useState(initial?.competitors ?? "");
  const [elements, setElements] = useState(initial?.elements ?? "");
  const [referenceUrl, setReferenceUrl] = useState(initial?.reference_url ?? "");
  const [reference, setReference] = useState<File | null>(null);
  const [aspectRatio, setAspectRatio] = useState(initial?.aspect_ratio ?? "9:16");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      idea: idea.trim(),
      industry: industry.trim(),
      competitors: competitors.trim(),
      elements: elements.trim() || undefined,
      reference_url: referenceUrl.trim() || undefined,
      reference,
      aspect_ratio: aspectRatio,
    });
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Idea" required hint="The core concept you want to visualize.">
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
            <TextInput value={industry} onChange={(e) => setIndustry(e.target.value)} required placeholder="Beverages" />
          </Field>
          <Field label="Competitor names" required hint="Comma-separated — we'll differentiate from them.">
            <TextInput
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              required
              placeholder="Brand A, Brand B"
            />
          </Field>
        </div>

        <Field label="Elements to include" hint="Optional — specific details to feature.">
          <TextInput value={elements} onChange={(e) => setElements(e.target.value)} placeholder="condensation droplets, sunrise tones" />
        </Field>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Reference URL" hint="Optional — a link for visual direction.">
            <TextInput
              type="url"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Reference upload" hint="Optional — photo/video for conditioning.">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/mp4,video/quicktime"
                onChange={(e) => setReference(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                {reference ? "Change file" : "Choose file"}
              </Button>
              {reference && (
                <span className="text-xs text-muted truncate max-w-[10rem]">{reference.name}</span>
              )}
            </div>
          </Field>
        </div>

        <Field label="Aspect ratio">
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="w-full bg-elevated border border-line rounded-lg px-3.5 py-2.5 text-sm text-neutral-100 focus:border-accent focus:outline-none"
          >
            {ASPECT_RATIOS.map((r) => (
              <option key={r.value} value={r.value} className="bg-panel">
                {r.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="pt-1">
          <Button type="submit" loading={disabled} className="w-full sm:w-auto">
            Generate image
          </Button>
        </div>
      </form>
    </Card>
  );
}
