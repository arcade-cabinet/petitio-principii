import { ArgumentMap } from "@/components/ui/argument-map";
import type { GameState } from "@/engine";
import type { WorldHandle } from "@/hooks/use-world";
import { isCircleClosed } from "@/world";
import { useMemo } from "react";

/**
 * ArgumentMapOverlay — the terminal-framed wrapper.
 *
 * Projects the koota world's visit history and circle-closed flag into the
 * plain-data shape `ArgumentMap` consumes. Re-derives on every render based
 * on the transcript length and current room, so the map updates in lock-
 * step with the transcript.
 */
export interface ArgumentMapOverlayProps {
  state: GameState;
  world: WorldHandle;
}

export function ArgumentMapOverlay({ state, world }: ArgumentMapOverlayProps) {
  // The actual koota mutations happen out-of-band from React's tracking;
  // we trigger re-reads by depending on the transcript length (every verb
  // appends lines, so this is a reliable "something changed" signal).
  const transcriptLength = state.transcript.length;
  const currentRoomId = state.currentRoomId;
  // biome-ignore lint/correctness/useExhaustiveDependencies: koota mutations drive updates through transcriptLength/currentRoomId
  const visited = useMemo(() => world.readVisitHistory(), [world, transcriptLength, currentRoomId]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: koota mutations drive updates through transcriptLength
  const circleClosed = useMemo(() => {
    const w = world.getWorld();
    return w ? isCircleClosed(w) : false;
  }, [world, transcriptLength]);

  return (
    <ArgumentMap
      visited={visited}
      currentRoomId={state.currentRoomId}
      circleClosed={circleClosed}
    />
  );
}
