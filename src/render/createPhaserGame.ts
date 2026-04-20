import { AUTO, Game, Scale } from "phaser";
import type { Game as GameType } from "phaser";
import { RetroDisplay } from "retrozone";
import { StarfieldScene } from "./scenes/StarfieldScene";

export interface PhaserBundle {
  /** Tear down both the Phaser game and the RetroZone overlay. */
  destroy(): void;
}

/**
 * Boot a Phaser 4 game inside `parent` and apply a RetroZone CRT overlay.
 *
 * Layer order after boot:
 *   0 – Phaser WebGL canvas  (starfield rendered with retrozone glow helpers)
 *   1 – RetroZone WebGL overlay  (CRT shader post-processing, pointer-events:none)
 *  10 – SolidJS terminal panel  (DOM overlay, interactive)
 * 100 – SolidJS New Game modal
 */
export function createPhaserGame(parent: HTMLElement): PhaserBundle {
  let display: RetroDisplay | null = null;

  const game: GameType = new Game({
    type: AUTO,
    parent,
    backgroundColor: "#05010A",
    scene: [StarfieldScene],
    scale: {
      mode: Scale.RESIZE,
      autoCenter: Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    audio: { noAudio: true },
  });

  setTimeout(() => {
    if (!game.canvas) return;
    display = new RetroDisplay(game.canvas, { mode: "crt" });
    if (display.overlayCanvas) {
      display.overlayCanvas.style.pointerEvents = "none";
      display.overlayCanvas.style.zIndex = "1";
    }
  }, 150);

  return {
    destroy() {
      display?.destroy();
      display = null;
      game.destroy(true);
    },
  };
}
