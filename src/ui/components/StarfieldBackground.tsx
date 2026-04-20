import { onCleanup, onMount } from "solid-js";
import type { PhaserBundle } from "../phaser/PhaserGame";
import { createPhaserGame } from "../phaser/PhaserGame";

export function StarfieldBackground() {
  let containerRef!: HTMLDivElement;
  let bundle: PhaserBundle | undefined;

  function handleResize() {
    // Dispatch resize event to trigger Phaser/Retrozone internal resizes if needed
  }

  onMount(() => {
    bundle = createPhaserGame(containerRef);
    window.addEventListener("resize", handleResize);
  });

  onCleanup(() => {
    window.removeEventListener("resize", handleResize);
    bundle?.destroy();
    bundle = undefined;
  });

  return <div ref={containerRef} class="starfield-phaser" aria-hidden="true" />;
}
