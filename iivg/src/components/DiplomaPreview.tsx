// src/components/DiplomaPreview.tsx
"use client";
import { useEffect, useMemo, useRef } from "react";
import { degreeIndex } from "@/lib/achievements";
import type { AchievementRecord } from "@/lib/types";
import { diplomaImageNumber } from "@/lib/achievements";
import { CONSOLE_ORDER } from "@/lib/consoleOrder";

export default function DiplomaPreview({
  record,
  userName,
  width = 800,              // logical draw size; display is responsive
}: {
  record: AchievementRecord;
  userName?: string;
  width?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const tplPath = useMemo(() => {
    const n = diplomaImageNumber(record.label, record.console, CONSOLE_ORDER);
    return `/images/diplomas/diploma_${n}.png`;
  }, [record.label, record.console]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    (async () => {
      try { await (document as any).fonts?.ready; } catch {}
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = width;
      const H = Math.round((2 / 3) * W); // keep 3:2 ratio like the modal (1200x800)
      canvas.width = W; canvas.height = H;

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);

        const nameText = userName || "Student";
        const consoleText = record.console;

        const namePx = Math.round(W * 0.08);  // scales with width
        const consPx = Math.round(W * 0.05);

        // Optional outline for readability
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.font = `700 ${namePx}px Roboto Mono, Arial, sans-serif`;
        ctx.lineWidth = Math.max(2, Math.round(namePx / 16));
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.strokeText(nameText, W / 2, H * 0.48);
        ctx.fillStyle = "#111";
        ctx.fillText(nameText, W / 2, H * 0.48);

        ctx.font = `500 ${consPx}px Roboto, Arial, sans-serif`;
        ctx.lineWidth = Math.max(2, Math.round(consPx / 16));
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.strokeText(consoleText, W / 2, H * 0.62);
        ctx.fillStyle = "#111";
        ctx.fillText(consoleText, W / 2, H * 0.62);
      };
      img.src = tplPath;
    })();
  }, [tplPath, record.console, userName, width]);

  // Responsive display (canvas scales to container width)
  return <canvas ref={canvasRef} className="w-full h-auto rounded-lg border" />;
}
