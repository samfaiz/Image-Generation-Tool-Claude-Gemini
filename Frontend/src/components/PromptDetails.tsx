"use client";

import { useState } from "react";
import type { ClaudeJson } from "@/lib/api";
import { Button } from "./ui";

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted mb-0.5">{label}</div>
      <div className="text-text/85">{value}</div>
    </div>
  );
}

function Chips({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="text-xs rounded-full border border-line bg-elevated px-2.5 py-1 text-text/85">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

type CopyKind = "prompt" | "json" | null;

export function PromptDetails({ json }: { json: ClaudeJson }) {
  const [copied, setCopied] = useState<CopyKind>(null);

  async function copy(value: string, kind: Exclude<CopyKind, null>) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1800);
    } catch {
      // Some browsers block clipboard access without https or user gesture.
      // Fallback: select-and-copy via a temp textarea.
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(kind);
        setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1800);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  return (
    <div className="space-y-4 text-sm">
      {/* Copy buttons — useful for pasting the prompt into a different tool. */}
      <div className="flex flex-wrap gap-2 -mt-1">
        <Button
          type="button"
          variant="outline"
          onClick={() => copy(json.final_prompt, "prompt")}
          className="text-xs py-1.5 px-3"
        >
          {copied === "prompt" ? "✓ Copied prompt" : "Copy final prompt"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => copy(JSON.stringify(json, null, 2), "json")}
          className="text-xs py-1.5 px-3"
        >
          {copied === "json" ? "✓ Copied JSON" : "Copy JSON"}
        </Button>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-muted mb-1">Final prompt</div>
        <p className="text-text/85 leading-relaxed">{json.final_prompt}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Meta label="Style" value={json.style} />
        <Meta label="Mood" value={json.mood} />
        <Meta label="Lighting" value={json.lighting} />
        <Meta label="Composition" value={json.composition} />
      </div>
      <Chips label="Color palette" items={json.color_palette} />
      <Chips label="Differentiators vs competitors" items={json.differentiators_vs_competitors} />
      <Chips label="Must include" items={json.must_include_elements} />
    </div>
  );
}
