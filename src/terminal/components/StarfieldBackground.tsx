import { type PhaserBundle, createPhaserGame } from "@/render";
import { onCleanup, onMount } from "solid-js";

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
