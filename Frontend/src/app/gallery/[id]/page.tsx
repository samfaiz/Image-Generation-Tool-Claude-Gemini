"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PromptDetails } from "@/components/PromptDetails";
import { WatermarkStudio } from "@/components/WatermarkStudio";
import { api, ApiError, type Generation } from "@/lib/api";
import { Alert, Button, Card, Spinner } from "@/components/ui";

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-sm py-1.5 border-b border-line/60 last:border-0">
      <span className="text-muted w-32 shrink-0">{label}</span>
      <span className="text-text/85">{value}</span>
    </div>
  );
}

export default function GenerationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();

  const [gen, setGen] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<null | "regen" | "delete">(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    try {
      setGen(await api.getGeneration(id));
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 403)) setMissing(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function regenerate() {
    setBusy("regen");
    setError(null);
    try {
      const updated = await api.generateImage(id);
      setGen(updated);
      setReloadKey((k) => k + 1); // cache-bust the canvas image
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to regenerate the image.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("Delete this generation permanently?")) return;
    setBusy("delete");
    try {
      await api.deleteGeneration(id);
      router.push("/gallery");
    } finally {
      setBusy(null);
    }
  }

  const imageUrl = gen?.image_url ? `${gen.image_url}?v=${reloadKey}` : null;

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/gallery" className="text-sm text-muted hover:text-text transition-colors">
          ← Back to gallery
        </Link>
        {gen && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push(`/studio?from=${id}`)}>
              Reuse inputs
            </Button>
            <Button variant="outline" loading={busy === "regen"} onClick={regenerate}>
              {gen.status === "completed" ? "Regenerate image" : "Generate image"}
            </Button>
            <Button variant="danger" loading={busy === "delete"} onClick={remove}>
              Delete
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted">
          <Spinner />
        </div>
      ) : missing || !gen ? (
        <Alert kind="error">This generation doesn&apos;t exist or isn&apos;t yours.</Alert>
      ) : (
        <div className="space-y-6">
          {error && <Alert kind="error">{error}</Alert>}

          {gen.status === "completed" && imageUrl ? (
            <WatermarkStudio key={reloadKey} imageUrl={imageUrl} />
          ) : (
            <Card className="p-8 text-center">
              <div className="text-sm text-muted capitalize mb-3">Status: {gen.status}</div>
              {gen.status === "failed" && gen.error && (
                <Alert kind="error">{gen.error}</Alert>
              )}
              {gen.status === "prompted" && (
                <p className="text-sm text-muted">Prompt is ready — click “Generate image” above.</p>
              )}
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-sm font-medium text-text mb-4">Inputs</h3>
              <InfoRow label="Idea" value={gen.idea} />
              <InfoRow label="Industry" value={gen.industry} />
              <InfoRow label="Competitors" value={gen.competitors} />
              <InfoRow label="Elements" value={gen.elements} />
              <InfoRow label="Reference URL" value={gen.reference_url} />
              <InfoRow label="Aspect ratio" value={gen.aspect_ratio} />
              <InfoRow label="Provider" value={gen.provider} />
            </Card>

            {gen.claude_json && (
              <Card className="p-6">
                <h3 className="text-sm font-medium text-text mb-4">Prompt breakdown</h3>
                <PromptDetails json={gen.claude_json} />
              </Card>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
