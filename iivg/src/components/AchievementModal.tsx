"use client";
import { useEffect, useMemo, useRef } from "react";
import { degreeIndex } from "@/lib/achievements";
import type { AchievementRecord } from "@/lib/types";

export default function AchievementModal({
  record,
  userName,
  onClose,
}: {
  record: AchievementRecord | null | undefined;
  userName?: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const tplPath = useMemo(() => {
    if (!record) return null;
    const idx = degreeIndex(record.label) ?? 1;
    return `/images/diplomas/diploma_${idx}.png`;
  }, [record]);

  useEffect(() => {
    if (!record || !tplPath || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Choose a reasonable output size (fits most templates)
    const W = 1200, H = 800;
    canvas.width = W; canvas.height = H;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Draw template
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);

      // Text styles (tweak positions later as you like)
      const nameText = userName || "Student";
      const consoleText = record.console;

      // Name
      ctx.font = "700 64px Roboto, Arial, sans-serif";
      ctx.fillStyle = "#111";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // center-ish
      ctx.fillText(nameText, W / 2, H * 0.48);

      // Console line
      ctx.font = "500 40px Roboto, Arial, sans-serif";
      ctx.fillText(consoleText, W / 2, H * 0.62);
    };
    img.src = tplPath;
  }, [record, tplPath, userName]);

  if (!record) return null;

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-[min(92vw,900px)] rounded-2xl border bg-white shadow-xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full border px-2.5 py-1.5 text-sm hover:bg-zinc-100"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="p-6 space-y-4">
          <div className="text-center font-game-title text-2xl">
            Congratulations! You&apos;ve graduated!
          </div>

          <div className="flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="w-full h-auto rounded-lg border"
            />
          </div>

          <p className="text-center text-sm text-zinc-600 px-4 pb-2">
            You can review your educational certificates at any time by clicking on <span className="font-semibold">“Achievements”</span> above.
            Keep completing courses to advance your studies!
          </p>
        </div>
      </div>
    </div>
  );
}
