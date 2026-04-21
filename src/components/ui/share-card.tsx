/**
 * ShareCard — T93 post-close share card.
 *
 * When the circle closes, renders a canvas-based image containing:
 *   • The argument map (visited nodes as colored dots on a rail)
 *   • The seed and phrase
 *   • "The argument has closed upon itself." win text
 *   • Turn count
 *
 * The card is shared via the Web Share API where available, or downloaded
 * as a PNG otherwise. Falls back to clipboard copy on platforms that
 * support neither (unlikely but possible).
 *
 * The component is lazy-mounted only when circleClosed is true, so the
 * canvas is only ever rendered once the game has ended.
 */
import type { ArgumentMapNode } from "@/components/ui/argument-map";
import type { RhetoricalType } from "@/content";
import { useCallback, useEffect, useRef, useState } from "react";

// ── canvas dimensions ────────────────────────────────────────────────────────
const CARD_W = 1200;
const CARD_H = 630; // Open Graph standard (2:1 roughly)

// ── palette — matches design tokens ─────────────────────────────────────────
const C_INK = "#05010a";
const C_PANEL = "#12051f";
const C_PANEL_EDGE = "#2a1a4a";
const C_SILVER = "#c0c0ff";
const C_HIGHLIGHT = "#f5f0ff";
const C_VIOLET = "#7a5cff";
const C_VIOLET_BRIGHT = "#9b7fff";
const C_PINK = "#ffd1fa";
const C_DIM = "#7070aa";
const C_MUTED = "#4a4a7a";

const TYPE_COLOR: Record<RhetoricalType, string> = {
  premise: C_SILVER,
  conclusion: C_HIGHLIGHT,
  definition: C_SILVER,
  analogy: C_PINK,
  objection: C_PINK,
  fallacy: C_VIOLET,
  circular: C_PINK,
  meta: "#ffffff",
};

function drawCard(
  canvas: HTMLCanvasElement,
  visited: readonly ArgumentMapNode[],
  currentRoomId: string,
  circleClosed: boolean,
  seed: number,
  phrase: string,
  turnCount: number
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = CARD_W;
  canvas.height = CARD_H;

  // ── background ──────────────────────────────────────────────────────────
  ctx.fillStyle = C_INK;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Subtle radial gradient for depth
  const grad = ctx.createRadialGradient(
    CARD_W / 2,
    CARD_H / 2,
    0,
    CARD_W / 2,
    CARD_H / 2,
    CARD_W * 0.7
  );
  grad.addColorStop(0, C_PANEL);
  grad.addColorStop(1, C_INK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Border
  ctx.strokeStyle = C_PANEL_EDGE;
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, CARD_W - 48, CARD_H - 48);

  // ── title ────────────────────────────────────────────────────────────────
  ctx.textAlign = "center";
  ctx.fillStyle = C_HIGHLIGHT;
  ctx.font = "italic 56px Georgia, serif";
  ctx.fillText("Petitio Principii", CARD_W / 2, 110);

  // ── phrase (incantation) ─────────────────────────────────────────────────
  ctx.fillStyle = C_SILVER;
  ctx.font = "italic 36px Georgia, serif";
  ctx.fillText(phrase, CARD_W / 2, 168);

  // ── win text ─────────────────────────────────────────────────────────────
  if (circleClosed) {
    ctx.fillStyle = C_PINK;
    ctx.font = "28px monospace";
    ctx.fillText("The argument has closed upon itself.", CARD_W / 2, 224);
  }

  // ── argument map rail ────────────────────────────────────────────────────
  const NODE_R = 8;
  const SPACING = 28;
  const railY = 330;
  const nodeCount = visited.length;
  const railW = Math.min((nodeCount - 1) * SPACING, CARD_W - 160);
  const startX = CARD_W / 2 - railW / 2;

  if (nodeCount > 1) {
    // Rail line
    ctx.strokeStyle = C_MUTED;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, railY);
    ctx.lineTo(startX + railW, railY);
    ctx.stroke();

    // Circle-close arc
    if (circleClosed && nodeCount >= 2) {
      const lastX = startX + Math.min((nodeCount - 1) * SPACING, railW);
      ctx.strokeStyle = C_PINK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc((startX + lastX) / 2, railY + 30, (lastX - startX) / 2 + 10, 0, Math.PI);
      ctx.stroke();
    }
  }

  // Nodes
  for (let i = 0; i < nodeCount; i++) {
    const node = visited[i];
    const x = startX + Math.min(i * SPACING, railW);
    const isActive = node.roomId === currentRoomId;
    const color = TYPE_COLOR[node.rhetoricalType] ?? C_SILVER;

    ctx.beginPath();
    ctx.arc(x, railY, isActive ? NODE_R + 2 : NODE_R, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    if (isActive) {
      ctx.strokeStyle = C_VIOLET_BRIGHT;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // ── seed + turn info ─────────────────────────────────────────────────────
  ctx.textAlign = "center";
  ctx.fillStyle = C_DIM;
  ctx.font = "22px monospace";
  ctx.fillText(
    `SEED ${seed}   ·   ${turnCount} turn${turnCount === 1 ? "" : "s"}`,
    CARD_W / 2,
    430
  );

  // ── share URL ────────────────────────────────────────────────────────────
  const shareURL = `${window.location.origin}${window.location.pathname}?seed=${seed}`;
  ctx.fillStyle = C_MUTED;
  ctx.font = "18px monospace";
  ctx.fillText(shareURL, CARD_W / 2, 480);

  // ── star field (simple dots) ─────────────────────────────────────────────
  const rng = mulberry32(seed ^ 0xd34db33f);
  for (let s = 0; s < 60; s++) {
    const sx = rng() * CARD_W;
    const sy = rng() * CARD_H;
    const sr = rng() * 1.5 + 0.4;
    const alpha = rng() * 0.5 + 0.1;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(192,192,255,${alpha})`;
    ctx.fill();
  }
}

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ShareCardProps {
  visited: readonly ArgumentMapNode[];
  currentRoomId: string;
  circleClosed: boolean;
  seed: number;
  phrase: string;
  turnCount: number;
}

export function ShareCard({
  visited,
  currentRoomId,
  circleClosed,
  seed,
  phrase,
  turnCount,
}: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "done" | "error">("idle");
  const [dataURL, setDataURL] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCard(canvas, visited, currentRoomId, circleClosed, seed, phrase, turnCount);
    setDataURL(canvas.toDataURL("image/png"));
  }, [visited, currentRoomId, circleClosed, seed, phrase, turnCount]);

  const handleShare = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !dataURL) return;

    setShareStatus("sharing");

    try {
      if (navigator.share) {
        // Web Share API — available on iOS Safari, Android Chrome, etc.
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
        });
        const file = new File([blob], `petitio-${seed}.png`, { type: "image/png" });
        const shareData: ShareData = {
          title: "Petitio Principii",
          text: `I closed the argument "${phrase}" in ${turnCount} turn${turnCount === 1 ? "" : "s"}.`,
          url: `${window.location.origin}${window.location.pathname}?seed=${seed}`,
        };
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ ...shareData, files: [file] });
        } else {
          await navigator.share(shareData);
        }
        setShareStatus("done");
      } else {
        // Fallback — download the image
        const a = document.createElement("a");
        a.href = dataURL;
        a.download = `petitio-${seed}.png`;
        a.click();
        setShareStatus("done");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled the share sheet — not an error
        setShareStatus("idle");
      } else {
        setShareStatus("error");
        setTimeout(() => setShareStatus("idle"), 3000);
      }
    }
  }, [dataURL, seed, phrase, turnCount]);

  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      {/* Hidden canvas used for image generation */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" tabIndex={-1} />

      {/* Preview thumbnail */}
      {dataURL && (
        <img
          src={dataURL}
          alt={`Argument map for seed ${seed}: ${phrase}. ${turnCount} turns.`}
          className="w-full max-w-[480px] rounded-[4px] border border-[var(--color-panel-edge)] opacity-90"
          style={{ aspectRatio: "1200/630" }}
        />
      )}

      {/* Share / download button */}
      <button
        type="button"
        onClick={handleShare}
        disabled={!dataURL || shareStatus === "sharing"}
        aria-label="Share your argument"
        className={`
          min-h-[44px] px-8 rounded-[5px]
          border border-[var(--color-violet)]
          font-[family-name:var(--font-display)] text-[1rem] tracking-[0.2em] uppercase
          transition-all duration-150
          ${
            shareStatus === "done"
              ? "bg-transparent text-[var(--color-silver)] border-[var(--color-silver)]"
              : shareStatus === "error"
                ? "bg-transparent text-[var(--color-pink)] border-[var(--color-pink)]"
                : "bg-[var(--color-violet)]/20 text-[var(--color-violet-bright)] hover:bg-[var(--color-violet)]/40"
          }
          disabled:opacity-40 disabled:cursor-not-allowed
        `}
      >
        {shareStatus === "sharing"
          ? "Sharing…"
          : shareStatus === "done"
            ? "Shared!"
            : shareStatus === "error"
              ? "Share failed"
              : "Share your argument"}
      </button>
    </div>
  );
}
