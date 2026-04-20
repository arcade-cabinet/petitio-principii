import Phaser from "phaser";
import { drawGlowCircle } from "retrozone";

// Star colours matching the game's night-sky palette
const STAR_COLORS = [0xffffff, 0xd0d0ff, 0xb0a0ff, 0xc0c0ff, 0xc8c8ff];

// Two populations: bright glowing foreground stars and dim background fill
const BRIGHT_COUNT = 40;
const DIM_COUNT = 120;

interface StarData {
  x: number;
  y: number;
  radius: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  color: number;
}

function makeStars(count: number, width: number, height: number, minR: number, maxR: number): StarData[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * (maxR - minR) + minR,
    baseOpacity: Math.random() * 0.45 + 0.3,
    twinkleSpeed: Math.random() * 0.0015 + 0.0004,
    twinkleOffset: Math.random() * Math.PI * 2,
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)] ?? 0xffffff,
  }));
}

export class StarfieldScene extends Phaser.Scene {
  private gfx!: Phaser.GameObjects.Graphics;
  private brightStars: StarData[] = [];
  private dimStars: StarData[] = [];

  constructor() {
    super({ key: "StarfieldScene" });
  }

  create(): void {
    // ADD blend mode is required for retrozone's multi-pass glow to composite correctly
    this.gfx = this.add.graphics();
    this.gfx.setBlendMode(Phaser.BlendModes.ADD);
    this.initStars();
    this.scale.on("resize", () => this.initStars());
  }

  private initStars(): void {
    const { width, height } = this.scale;
    // Bright foreground stars — drawn with retrozone's multi-pass glow
    this.brightStars = makeStars(BRIGHT_COUNT, width, height, 1.0, 2.5);
    // Dim background fill — plain Graphics circles for performance
    this.dimStars = makeStars(DIM_COUNT, width, height, 0.4, 1.1);
  }

  update(time: number): void {
    this.gfx.clear();

    // Dim background layer — plain circles at low alpha
    for (const star of this.dimStars) {
      const alpha =
        (star.baseOpacity + Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.15) * 0.45;
      this.gfx.fillStyle(star.color, Math.max(0, Math.min(1, alpha)));
      this.gfx.fillCircle(star.x, star.y, star.radius);
    }

    // Bright foreground layer — retrozone multi-pass phosphor glow
    for (const star of this.brightStars) {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
      // Vary radius ±25 % for the twinkle animation
      const radius = star.radius * (1 + twinkle * 0.25);
      drawGlowCircle(this.gfx, star.x, star.y, radius, star.color);
    }
  }
}
