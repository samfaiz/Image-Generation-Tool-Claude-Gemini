"use client";

import type { MarketRead } from "@/lib/api";
import { Card } from "./ui";

export function MarketReadCard({ market }: { market: MarketRead }) {
  return (
    <Card className="p-6 space-y-5 text-sm">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted mb-1">Market read</div>
        <p className="text-text leading-relaxed">{market.summary}</p>
      </div>

      {market.competitor_visuals?.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-2">What competitors look like</div>
          <ul className="space-y-1.5">
            {market.competitor_visuals.map((c, i) => (
              <li key={i} className="text-text/85">
                <span className="text-text font-medium">{c.name}:</span> {c.common_traits}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        {market.visual_cliches_to_avoid?.length > 0 && (
          <TagList label="Cliches to avoid" items={market.visual_cliches_to_avoid} tone="danger" />
        )}
        {market.differentiation_angles?.length > 0 && (
          <TagList label="Differentiation angles" items={market.differentiation_angles} tone="success" />
        )}
      </div>

      {market.palette_direction && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Palette direction</div>
          <p className="text-text/85">{market.palette_direction}</p>
        </div>
      )}
    </Card>
  );
}

function TagList({ label, items, tone }: { label: string; items: string[]; tone: "danger" | "success" }) {
  const colors =
    tone === "danger"
      ? "border-danger/30 bg-danger/10 text-danger"
      : "border-success/30 bg-success/10 text-success";
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted mb-2">{label}</div>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-0.5 inline-block h-1.5 w-1.5 rounded-full ${colors}`} />
            <span className="text-text">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
