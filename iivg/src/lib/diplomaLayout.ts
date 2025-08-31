// src/lib/diplomaLayout.ts
export type TextBox = {
  x: number;       // canvas coords (we draw at 1200x800)
  y: number;
  w: number;       // max width for the text
  h: number;       // max height (used for auto-size clamp)
  align?: CanvasTextAlign;        // default: "center"
  baseline?: CanvasTextBaseline;  // default: "middle"
  font?: string;                  // default: "700 48px Roboto Mono, Arial, sans-serif"
  fill?: string;                  // default: "#111"
  stroke?: string;                // optional outline
  lineWidth?: number;             // outline width
};

export type DiplomaLayout = {
  nameBox: TextBox;
  consoleBox?: TextBox; // omit to hide console line on that template
};

// Default placement used when no override exists.
const fallback: DiplomaLayout = {
  nameBox: {
    x: 600, y: 440, w: 900, h: 96,
    align: "center", baseline: "middle",
    font: "700 48px Roboto Mono, Arial, sans-serif",
    fill: "#111"
  },
  consoleBox: {
    x: 600, y: 544, w: 900, h: 72,
    align: "center", baseline: "middle",
    font: "700 40px Roboto Mono, Arial, sans-serif",
    fill: "#111"
  }
};

/**
 * Put per-template adjustments here.
 * Key = diploma image number (e.g. diploma_59.png -> 59)
 */
export const DIPLOMA_LAYOUTS: Record<number, Partial<DiplomaLayout>> = {
  // examples — add/adjust as you discover issues:
  1: {
    nameBox: { x: 600, y: 440, w: 860, h: 96 }, // kindergarten #1 tweak
    // consoleBox: { ... } // (inherit default if not set)
  },
  30: {
    nameBox: { x: 610, y: 440, w: 820, h: 90 }, // primary #1 tweak
  },
  31: {
    nameBox: { x: 600, y: 480, w: 820, h: 90 }, // primary #1 tweak
  },
  32: {
    nameBox: { x: 610, y: 450, w: 820, h: 90 }, // primary #1 tweak
  },
  59: {
    nameBox: { x: 590, y: 500, w: 780, h: 90 },
  },
  88: {
    nameBox: { x: 600, y: 340, w: 780, h: 90 },
  }
};

{
  const base = DIPLOMA_LAYOUTS[88] || {};
  for (let n = 88; n <= 112; n++) {
    DIPLOMA_LAYOUTS[n] = {
      // clone so later tweaks to one number won't affect the others
      nameBox: base.nameBox ? { ...base.nameBox } : undefined,
      consoleBox: base.consoleBox ? { ...base.consoleBox } : undefined,
    };
  }
}

function mergeBox(base: TextBox, patch?: Partial<TextBox>): TextBox {
  return patch ? { ...base, ...patch } : base;
}

export function getDiplomaLayout(n: number): DiplomaLayout {
  const ov = DIPLOMA_LAYOUTS[n] || {};
  return {
    nameBox: mergeBox(fallback.nameBox, ov.nameBox),
    consoleBox: ov.consoleBox ? mergeBox(fallback.consoleBox!, ov.consoleBox) : fallback.consoleBox
  };
}

/** Fit text into a box width, reducing font size down to min if needed */
export function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: TextBox,
  minPx = 14
) {
  const pxMatch = /(\d+)px/.exec(box.font || "");
  const basePx = pxMatch ? parseInt(pxMatch[1], 10) : 40;
  const maxPx = Math.min(basePx, box.h); // keep height in check

  const withPx = (f: string | undefined, px: number) =>
    (f || "").replace(/\b\d+px\b/, `${Math.round(px)}px`) ||
    `700 ${Math.round(px)}px Roboto Mono, Arial, sans-serif`;

  ctx.textAlign = box.align ?? "center";
  ctx.textBaseline = box.baseline ?? "middle";
  ctx.fillStyle = box.fill ?? "#111";

  let size = maxPx;
  ctx.font = withPx(box.font, size);
  while (ctx.measureText(text).width > box.w && size > minPx) {
    size -= 1;
    ctx.font = withPx(box.font, size);
  }

  if (box.stroke && box.lineWidth) {
    ctx.lineWidth = box.lineWidth;
    ctx.strokeStyle = box.stroke;
    ctx.strokeText(text, box.x, box.y);
  }

  ctx.fillText(text, box.x, box.y);
}
