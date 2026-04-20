import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

/**
 * CrystalField — the memory-palace backdrop.
 *
 * Canon: "memory-palace-in-the-night-sky. Twinkling silver stars. Deep purples."
 * Interpretation: the player's gaze *cuts crystalline lines through the void*;
 * their click *shatters* a cluster of light. Silver strokes from the pointer,
 * violet glow, pink shatter shards. No stars — stars were literal; the crystal
 * field is the *feeling* of starlight remembered.
 *
 * Adapted from the reference CrystalCursor component but rewritten as a
 * framework-native React primitive, palette-mapped to Petitio Principii,
 * and spec'd for reduced-motion and passive listeners.
 */
export interface CrystalFieldProps {
  className?: string;
}

interface Crystal {
  x: number;
  y: number;
  angle: number;
  radius: number;
  targetRadius: number;
  life: number;
  lineWidth: number;
  turnAngle: number;
}

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  hue: number;
}

const CRYSTAL_LIFE = 150;
const SHARD_LIFE = 100;
const MAX_CRYSTALS = 180;
const MAX_SHARDS = 320;

export function CrystalField({ className }: CrystalFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let crystals: Crystal[] = [];
    let shards: Shard[] = [];
    let rafId = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const spawnCrystal = (x: number, y: number): Crystal => ({
      x,
      y,
      angle: Math.random() * Math.PI * 2,
      radius: 0,
      targetRadius: Math.random() * 80 + 20,
      life: CRYSTAL_LIFE,
      lineWidth: Math.random() * 1.5 + 0.4,
      turnAngle: (Math.random() - 0.5) * 0.08,
    });

    const spawnShard = (x: number, y: number): Shard => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: SHARD_LIFE,
        size: Math.random() * 3 + 1,
        // Distribute shards across the violet→pink arc of our palette
        hue: 280 + Math.random() * 40,
      };
    };

    const drawCrystal = (c: Crystal) => {
      const alpha = c.life / CRYSTAL_LIFE;
      // Silver core
      ctx.strokeStyle = `hsla(240, 100%, 87%, ${alpha * 0.85})`;
      ctx.lineWidth = c.lineWidth;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(122, 92, 255, 0.8)";
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      const endX = c.x + Math.cos(c.angle) * c.radius;
      const endY = c.y + Math.sin(c.angle) * c.radius;
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const drawShard = (s: Shard) => {
      const alpha = s.life / SHARD_LIFE;
      ctx.fillStyle = `hsla(${s.hue}, 100%, 85%, ${alpha})`;
      ctx.shadowBlur = 6;
      ctx.shadowColor = `hsla(${s.hue}, 100%, 70%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const tick = () => {
      // Deep-purple phosphor fade — blends old strokes into the ink
      ctx.fillStyle = "rgba(5, 1, 10, 0.12)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      if (!reducedMotion && crystals.length < MAX_CRYSTALS && Math.random() > 0.7) {
        crystals.push(
          spawnCrystal(mouse.x + (Math.random() - 0.5) * 60, mouse.y + (Math.random() - 0.5) * 60)
        );
      }

      crystals = crystals.filter((c) => c.life > 0);
      for (const c of crystals) {
        if (c.radius < c.targetRadius) c.radius += 0.5;
        c.life -= 1;
        c.angle += c.turnAngle;
        drawCrystal(c);
      }

      if (shards.length > MAX_SHARDS) {
        shards.splice(0, shards.length - MAX_SHARDS);
      }
      shards = shards.filter((s) => s.life > 0);
      for (const s of shards) {
        s.x += s.vx;
        s.y += s.vy;
        // Subtle drag so shards settle instead of flying forever
        s.vx *= 0.98;
        s.vy *= 0.98;
        s.life -= 1;
        drawShard(s);
      }

      rafId = requestAnimationFrame(tick);
    };
    tick();

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onDown = (e: PointerEvent) => {
      for (let i = 0; i < 40; i++) {
        shards.push(spawnShard(e.clientX, e.clientY));
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("resize", resize, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none fixed inset-0 z-0", className)}
    />
  );
}
