import { onCleanup, onMount } from "solid-js";
import type { PhaserBundle } from "../phaser/PhaserGame";
import { createPhaserGame } from "../phaser/PhaserGame";

export function StarfieldBackground() {
  let containerRef!: HTMLDivElement;
  let bundle: PhaserBundle | undefined;

  onMount(() => {
    bundle = createPhaserGame(containerRef);
  });

  onCleanup(() => {
    bundle?.destroy();
    bundle = undefined;
  });

  return <div ref={containerRef} class="starfield-phaser" aria-hidden="true" />;
}
