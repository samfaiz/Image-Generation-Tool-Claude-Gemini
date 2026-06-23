"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card } from "./ui";

type Point = { x: number; y: number };

/**
 * Step 4 — Watermark Studio.
 *
 * The generated image is loaded with crossOrigin="use-credentials" from the
 * backend image proxy (served with CORS + credentials), so the canvas is NOT
 * tainted and toDataURL()/download works. Upload a logo, drag to position,
 * adjust opacity/size, then download the composited PNG.
 */
export function WatermarkStudio({ imageUrl }: { imageUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLImageElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 });

  const [baseLoaded, setBaseLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [hasLogo, setHasLogo] = useState(false);
  const [pos, setPos] = useState<Point>({ x: 0, y: 0 });
  const [alpha, setAlpha] = useState(1);
  const [scale, setScale] = useState(0.28); // logo width as a fraction of canvas width

  const logoBox = useCallback(() => {
    const canvas = canvasRef.current;
    const logo = logoRef.current;
    if (!canvas || !logo) return null;
    const w = canvas.width * scale;
    const h = w * (logo.height / logo.width);
    return { w, h };
  }, [scale]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const base = baseRef.current;
    if (!canvas || !ctx || !base) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0, canvas.width, canvas.height);

    const logo = logoRef.current;
    const box = logoBox();
    if (logo && box) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(logo, pos.x - box.w / 2, pos.y - box.h / 2, box.w, box.h);
      ctx.globalAlpha = 1;
    }
  }, [alpha, pos, logoBox]);

  // Load the base (generated) image.
  useEffect(() => {
    setBaseLoaded(false);
    setLoadError(false);
    const img = new Image();
    img.crossOrigin = "use-credentials"; // send session cookie + stay CORS-clean
    img.onload = () => {
      baseRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        setPos({ x: img.naturalWidth / 2, y: img.naturalHeight / 2 });
      }
      setBaseLoaded(true);
    };
    img.onerror = () => setLoadError(true);
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (baseLoaded) redraw();
  }, [baseLoaded, redraw, hasLogo]);

  function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      logoRef.current = img;
      setHasLogo(true);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // Map a pointer event to canvas (intrinsic) coordinates.
  function toCanvasCoords(e: React.PointerEvent): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    const box = logoBox();
    if (!box || !logoRef.current) return;
    const p = toCanvasCoords(e);
    const within =
      p.x >= pos.x - box.w / 2 &&
      p.x <= pos.x + box.w / 2 &&
      p.y >= pos.y - box.h / 2 &&
      p.y <= pos.y + box.h / 2;
    if (within) {
      draggingRef.current = true;
      dragOffsetRef.current = { x: p.x - pos.x, y: p.y - pos.y };
      canvasRef.current?.setPointerCapture(e.pointerId);
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const canvas = canvasRef.current!;
    const p = toCanvasCoords(e);
    setPos({
      x: Math.max(0, Math.min(canvas.width, p.x - dragOffsetRef.current.x)),
      y: Math.max(0, Math.min(canvas.height, p.y - dragOffsetRef.current.y)),
    });
  }

  function onPointerUp(e: React.PointerEvent) {
    draggingRef.current = false;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const link = document.createElement("a");
      link.download = `ai-image-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("Could not export the image (canvas was tainted). Check backend CORS.");
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_18rem] gap-6">
      <Card className="p-4 flex items-center justify-center">
        {loadError ? (
          <Alert kind="error">Could not load the generated image.</Alert>
        ) : (
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="max-h-[70vh] max-w-full rounded-lg touch-none"
            style={{ cursor: hasLogo ? "move" : "default" }}
          />
        )}
      </Card>

      <div className="space-y-5">
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-medium text-text">Watermark Studio</h3>

          <label className="block">
            <span className="block text-sm text-text/85 mb-1.5">Logo / watermark</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={onLogoFile}
              className="block w-full text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-elevated file:px-3 file:py-2 file:text-sm file:text-text hover:file:bg-white/10"
            />
            <span className="block text-xs text-muted mt-1.5">Then drag it onto the image to position.</span>
          </label>

          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-text/85">Opacity</span>
              <span className="text-muted">{Math.round(alpha * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={alpha}
              onChange={(e) => setAlpha(Number(e.target.value))}
              disabled={!hasLogo}
              className="w-full accent-accent"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-text/85">Size</span>
              <span className="text-muted">{Math.round(scale * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.9}
              step={0.01}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              disabled={!hasLogo}
              className="w-full accent-accent"
            />
          </div>
        </Card>

        <Button onClick={download} disabled={!baseLoaded} className="w-full">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
          </svg>
          Download result
        </Button>
      </div>
    </div>
  );
}
