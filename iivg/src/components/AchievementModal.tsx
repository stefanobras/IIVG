// src/components/AchievementModal.tsx
"use client";
import { useEffect, useMemo, useRef } from "react";
import type { AchievementRecord } from "@/lib/types";
import { degreeIndex, diplomaImageNumber } from "@/lib/achievements";
import { useIIVG } from "@/store/useIIVG";
import { CONSOLE_ORDER } from "@/lib/consoleOrder";
import { getDiplomaLayout, drawFittedText } from "@/lib/diplomaLayout";

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
  const savedKeyRef = useRef<string | null>(null);
  const { attachImageToLastEarned } = useIIVG();

  // Which template image to use
  const imgNum = useMemo(() => {
    if (!record) return null;
    return diplomaImageNumber(record.label, record.console, CONSOLE_ORDER);
  }, [record]);

  const tplPath = useMemo(() => {
    return imgNum ? `/images/diplomas/diploma_${imgNum}.png` : null;
  }, [imgNum]);

  useEffect(() => {
    if (!record || !tplPath || !canvasRef.current || !imgNum) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw at 1200x800; canvas scales via CSS
    const W = 1200, H = 800;
    canvas.width = W; canvas.height = H;

    const layout = getDiplomaLayout(imgNum);
    const level = degreeIndex(record.label) ?? 1; // 1 = Kindergarten
    const showConsole = level === 1 && !!layout.consoleBox;

    const img = new Image();
    // same origin: no crossOrigin to avoid tainting
    img.onload = async () => {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);

      const nameText = userName || "Student";
      drawFittedText(ctx, nameText, layout.nameBox);

      if (showConsole) {
        drawFittedText(ctx, record.console, layout.consoleBox!);
      }

      // Save final rendered PNG once per console+label combo
      const key = `${record.console}__${record.label}`;
      if (savedKeyRef.current !== key) {
        savedKeyRef.current = key;
        try {
          const dataUrl = canvas.toDataURL("image/png");
          attachImageToLastEarned(dataUrl);

          // Upload to Supabase Storage + save URL in DB (fire-and-forget)
          try {
            const { uploadDiplomaAndSaveURL } = await import("@/lib/supabase/upload");
            await uploadDiplomaAndSaveURL(record, dataUrl);
          } catch {
            // ignore upload errors; UI already shows the local render
          }
        } catch {
          // ignore
        }
      }
    };
    img.src = tplPath;
  }, [record, tplPath, imgNum, userName, attachImageToLastEarned]);

  if (!record) return null;

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-[min(92vw,900px)] rounded-2xl border bg-black shadow-xl">
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
            <canvas ref={canvasRef} className="w-full h-auto rounded-lg border" />
          </div>

          <p className="text-center text-m text-white px-4 pb-2">
            You can review your educational certificates at any time by clicking on{" "}
            <span className="font-semibold">“Achievements”</span> above.
            <br />
            Keep completing courses to advance your studies!
          </p>
        </div>
      </div>
    </div>
  );
}
