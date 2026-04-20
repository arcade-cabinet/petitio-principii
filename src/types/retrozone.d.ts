/**
 * TypeScript declarations for the retrozone package.
 * Retrozone is a JavaScript-only library (https://github.com/TheMarco/retrozone).
 * These types reflect its public API as documented in the README.
 */
declare module "retrozone" {
  // ── Minimal Phaser Graphics duck-type ─────────────────────────────────────
  // retrozone's glow functions work with any object that has this shape,
  // matching Phaser.GameObjects.Graphics without a hard Phaser dependency.
  interface GraphicsLike {
    fillStyle(color: number, alpha?: number): this;
    fillCircle(x: number, y: number, radius: number): this;
    fillRect(x: number, y: number, width: number, height: number): this;
    fillEllipse(x: number, y: number, width: number, height: number, smoothness?: number): this;
    clear(): this;
    setBlendMode(blendMode: number | string): this;
    setAlpha(alpha: number): this;
    lineStyle(lineWidth: number, color: number, alpha?: number): this;
    beginPath(): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    strokePath(): this;
  }

  // ── RetroDisplay ─────────────────────────────────────────────────────────
  export interface RetroDisplayOptions {
    mode?: "vector" | "crt";
    phosphorDecay?: number;
    persist?: boolean;
    storageKey?: string;
  }

  export class RetroDisplay {
    constructor(canvas: HTMLCanvasElement, options?: RetroDisplayOptions);
    setMode(mode: "vector" | "crt"): void;
    getMode(): "vector" | "crt";
    setPhosphorDecay(value: number): void;
    readonly overlayCanvas: HTMLCanvasElement | null;
    destroy(): void;
  }

  // ── Low-level shader overlay ──────────────────────────────────────────────
  export interface ShaderOverlay {
    setShader(mode: "vector" | "crt"): void;
    getShaderName(): "vector" | "crt";
    setPhosphorDecay(value: number): void;
    destroy(): void;
    readonly overlay: HTMLCanvasElement;
  }

  export interface ShaderOverlayOptions {
    mode?: "vector" | "crt";
    phosphorDecay?: number;
  }

  export function createShaderOverlay(
    canvas: HTMLCanvasElement,
    options?: ShaderOverlayOptions
  ): ShaderOverlay;

  // ── Projection ────────────────────────────────────────────────────────────
  export interface ProjectedPoint {
    x: number;
    y: number;
    scale: number;
  }

  export interface ProjectedSegment {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    depth?: number;
    scale?: number;
  }

  export interface ModelSegment {
    from: [number, number, number];
    to: [number, number, number];
  }

  export interface Projection {
    projectPoint(x: number, y: number, z: number): ProjectedPoint;
    getScale(z: number): number;
    projectModel(
      lines: ModelSegment[],
      x: number,
      y: number,
      z: number,
      scale: number,
      rotation: number
    ): ProjectedSegment[];
    projectModelFlat(
      lines: ModelSegment[],
      sx: number,
      sy: number,
      scale: number,
      rotation: number
    ): ProjectedSegment[];
  }

  export interface ProjectionConfig {
    centerX: number;
    centerY: number;
    perspective?: number;
  }

  export function createProjection(config: ProjectionConfig): Projection;

  // ── Glow rendering (Phaser 4 Graphics in ADD blend mode) ─────────────────
  export function drawGlowLine(
    gfx: GraphicsLike,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number,
    mask?: boolean,
    passes?: number
  ): void;

  export function drawGlowCircle(
    gfx: GraphicsLike,
    cx: number,
    cy: number,
    radius: number,
    color: number,
    segments?: number,
    mask?: boolean
  ): void;

  export function drawGlowPolygon(
    gfx: GraphicsLike,
    points: Array<{ x: number; y: number }>,
    color: number,
    mask?: boolean
  ): void;

  export function drawGlowDiamond(
    gfx: GraphicsLike,
    cx: number,
    cy: number,
    size: number,
    color: number
  ): void;

  export function drawGlowEllipse(
    gfx: GraphicsLike,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    color: number,
    rotation?: number,
    segments?: number,
    mask?: boolean
  ): void;

  export function drawGlowArc(
    gfx: GraphicsLike,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    color: number,
    rotation?: number,
    start?: number,
    end?: number,
    segments?: number
  ): void;

  export function drawGlowDashedEllipse(
    gfx: GraphicsLike,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    color: number,
    ...args: unknown[]
  ): void;

  export function drawGlowDashedLine(
    gfx: GraphicsLike,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number,
    ...args: unknown[]
  ): void;

  export function fillMaskRect(gfx: GraphicsLike, x: number, y: number, w: number, h: number): void;

  export function fillMaskCircle(gfx: GraphicsLike, cx: number, cy: number, radius: number): void;

  export function fillMaskEllipse(
    gfx: GraphicsLike,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rotation?: number
  ): void;

  // ── Vector font ───────────────────────────────────────────────────────────
  export function vectorText(
    text: string,
    x: number,
    y: number,
    scale: number,
    spacing?: number
  ): ProjectedSegment[];

  export function vectorTextWidth(text: string, scale: number, spacing?: number): number;

  // ── Explosion renderer ────────────────────────────────────────────────────
  export interface ExplosionOptions {
    particleCount?: number;
    particleSpeed?: number;
    particleLifeMs?: number;
    tailLength?: number;
    lineWidth?: number;
  }

  export class ExplosionRenderer {
    constructor(options?: ExplosionOptions);
    spawn(x: number, y: number, color: number): void;
    update(deltaMs: number): void;
    draw(gfx: GraphicsLike): void;
    readonly active: boolean;
  }

  // ── Pre-built wireframe models ────────────────────────────────────────────
  export const MODELS: Record<string, ModelSegment[]>;
  export const FIGHTER: ModelSegment[];
  export const MOTH: ModelSegment[];
  export const HORNET: ModelSegment[];
  export const CROWN: ModelSegment[];
  export const SPINNER: ModelSegment[];
  export const BEETLE: ModelSegment[];
  export const CRYSTAL: ModelSegment[];
  export const JELLYFISH: ModelSegment[];
  export const SPIDER: ModelSegment[];
  export const WARSHIP: ModelSegment[];
  export const BULLET: ModelSegment[];
  export const DART: ModelSegment[];
}
