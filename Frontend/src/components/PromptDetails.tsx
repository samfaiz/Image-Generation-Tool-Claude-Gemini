"use client";

import type { ClaudeJson } from "@/lib/api";

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

export function PromptDetails({ json }: { json: ClaudeJson }) {
  return (
    <div className="space-y-4 text-sm">
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
