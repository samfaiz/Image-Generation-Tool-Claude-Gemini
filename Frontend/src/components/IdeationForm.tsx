"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MAX_REFERENCE_IMAGES, type IdeationInput } from "@/lib/api";
import { Button, Card, Field, TextArea, TextInput } from "./ui";

const ASPECT_RATIOS = [
  { value: "9:16", label: "9:16 · Vertical (default)" },
  { value: "1:1", label: "1:1 · Square" },
  { value: "4:3", label: "4:3 · Landscape" },
  { value: "3:4", label: "3:4 · Portrait" },
  { value: "16:9", label: "16:9 · Wide" },
];

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB — matches backend `max:20480` (KB).

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
  const [references, setReferences] = useState<File[]>(initial?.references ?? []);
  const [aspectRatio, setAspectRatio] = useState(initial?.aspect_ratio ?? "9:16");
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(picked: FileList | null) {
    if (!picked || picked.length === 0) return;
    setFileError(null);
    const rejects: string[] = [];
    const accepted: File[] = [];
    for (const f of Array.from(picked)) {
      if (!ALLOWED_MIME.includes(f.type)) {
        rejects.push(`${f.name} (unsupported type)`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        rejects.push(`${f.name} (over 20 MB)`);
        continue;
      }
      accepted.push(f);
    }
    setReferences((cur) => {
      const merged = [...cur, ...accepted].slice(0, MAX_REFERENCE_IMAGES);
      const dropped = cur.length + accepted.length - merged.length;
      if (dropped > 0) {
        rejects.push(`${dropped} extra file${dropped === 1 ? "" : "s"} (max ${MAX_REFERENCE_IMAGES})`);
      }
      return merged;
    });
    if (rejects.length) setFileError(`Skipped: ${rejects.join(", ")}`);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeAt(i: number) {
    setReferences((cur) => cur.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      idea: idea.trim(),
      industry: industry.trim(),
      competitors: competitors.trim(),
      elements: elements.trim() || undefined,
      reference_url: referenceUrl.trim() || undefined,
      references,
      aspect_ratio: aspectRatio,
    });
  }

  const canAddMore = references.length < MAX_REFERENCE_IMAGES;

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

        <Field label="Reference URL" hint="Optional — a link for visual direction.">
          <TextInput
            type="url"
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            placeholder="https://…"
          />
        </Field>

        <Field
          label={`Reference images (${references.length}/${MAX_REFERENCE_IMAGES})`}
          hint={`Optional — up to ${MAX_REFERENCE_IMAGES} images. JPG/PNG/WEBP/GIF, max 20 MB each. All are sent to Claude; the first is also used as the image-model conditioning.`}
          error={fileError ?? undefined}
        >
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept={ALLOWED_MIME.join(",")}
              multiple
              onChange={(e) => addFiles(e.target.files)}
              className="hidden"
            />
            {references.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {references.map((f, i) => (
                  <ThumbCard key={`${f.name}-${i}`} file={f} index={i} onRemove={() => removeAt(i)} />
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={!canAddMore}
              >
                {references.length === 0 ? "Choose images" : "Add more"}
              </Button>
              {!canAddMore && (
                <span className="text-xs text-muted">Max reached — remove one to add another.</span>
              )}
            </div>
          </div>
        </Field>

        <Field label="Aspect ratio">
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="w-full bg-elevated border border-line rounded-lg px-3.5 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
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

function ThumbCard({ file, index, onRemove }: { file: File; index: number; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <div className="relative group rounded-lg border border-line bg-elevated overflow-hidden">
      <div className="aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={file.name} className="h-full w-full object-cover" />
      </div>
      {index === 0 && (
        <span className="absolute top-1.5 left-1.5 text-[10px] uppercase tracking-wider bg-accent/85 text-on-accent rounded px-1.5 py-0.5">
          Primary
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 h-6 w-6 grid place-items-center rounded-full bg-black/70 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger/80"
        aria-label={`Remove ${file.name}`}
      >
        ×
      </button>
      <div className="px-2 py-1.5 text-[11px] text-muted truncate">{file.name}</div>
    </div>
  );
}
