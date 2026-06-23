"use client";

import { Card } from "./ui";

export function VariationsGrid({
  urls,
  selected,
  onSelect,
}: {
  urls: string[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  if (urls.length <= 1) return null;

  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted mb-3 px-1.5">
        {urls.length} variations · pick one to refine
      </div>
      <div className={`grid gap-2.5 ${gridCols(urls.length)}`}>
        {urls.map((url, i) => {
          const active = i === selected;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              className={`relative rounded-lg overflow-hidden border transition-all ${
                active ? "border-accent ring-2 ring-accent/40" : "border-line hover:border-line"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Variation ${i + 1}`}
                crossOrigin="use-credentials"
                className="w-full h-full object-cover aspect-square block"
              />
              <span
                className={`absolute top-1.5 left-1.5 text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 ${
                  active ? "bg-accent text-on-accent" : "bg-black/70 text-text"
                }`}
              >
                {active ? "Selected" : `V${i + 1}`}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function gridCols(n: number): string {
  if (n <= 2) return "grid-cols-2";
  if (n === 3) return "grid-cols-3";
  return "grid-cols-2 sm:grid-cols-4";
}
