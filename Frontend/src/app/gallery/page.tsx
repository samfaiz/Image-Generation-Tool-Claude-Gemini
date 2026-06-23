"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { api, type Generation } from "@/lib/api";
import { Button, Card, Spinner } from "@/components/ui";

export default function GalleryPage() {
  const [items, setItems] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.listGenerations();
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: number) {
    if (!confirm("Delete this generation?")) return;
    await api.deleteGeneration(id);
    setItems((prev) => prev.filter((g) => g.id !== id));
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text">Gallery</h1>
          <p className="text-muted text-sm">Your generation history.</p>
        </div>
        <Link href="/studio">
          <Button>New image</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-muted">
          No generations yet.{" "}
          <Link href="/studio" className="text-accent-hover hover:underline">
            Create your first
          </Link>
          .
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((g) => (
            <Card key={g.id} className="overflow-hidden group">
              <Link href={`/gallery/${g.id}`} className="block aspect-[9/16] bg-elevated relative">
                {g.image_url && g.status === "completed" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.image_url} alt={g.idea} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xs text-muted capitalize">
                    {g.status}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors grid place-items-center">
                  <span className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    Open
                  </span>
                </div>
              </Link>
              <div className="p-3">
                <Link href={`/gallery/${g.id}`}>
                  <p className="text-xs text-text/85 line-clamp-2 leading-snug hover:text-text transition-colors">
                    {g.idea}
                  </p>
                </Link>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted">
                    {g.provider ?? g.status}
                  </span>
                  <button
                    onClick={() => remove(g.id)}
                    className="text-[11px] text-muted hover:text-danger transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
