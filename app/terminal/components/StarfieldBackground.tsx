import { onCleanup, onMount } from "solid-js";
import type { PhaserBundle } from "@app/render/PhaserGame";
import { createPhaserGame } from "@app/render/PhaserGame";

export const StarfieldBackground = () => {
  let containerRef!: HTMLDivElement;
  let phaserInstance: PhaserBundle | null = null;

  onMount(() => {
    phaserInstance = createPhaserGame(containerRef);
  });

  onCleanup(() => {
    if (phaserInstance) {
      phaserInstance.destroy();
    }
  });

  return <div ref={containerRef} id="starfield-phaser" class="starfield-container" />;
};
