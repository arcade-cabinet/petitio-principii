import { Show, createMemo, createSignal } from "solid-js";
import type { Component } from "solid-js";
import { generatePhrase } from "../../engine/core/NarrativeGenerator";
import { generateSeed } from "../../engine/prng/seedRandom";

interface ModalNewGameProps {
  onStart: (seed: number) => void;
}

export const ModalNewGame: Component<ModalNewGameProps> = (props) => {
  const [seed, setSeed] = createSignal<number>(generateSeed());
  const [customSeedInput, setCustomSeedInput] = createSignal("");
  const [showCustomSeed, setShowCustomSeed] = createSignal(false);

  const phrase = createMemo(() => generatePhrase(seed()));

  function handleRegenerate() {
    setSeed(generateSeed());
    setCustomSeedInput("");
    setShowCustomSeed(false);
  }

  function handleCustomSeedSubmit() {
    const parsed = Number.parseInt(customSeedInput(), 10);
    if (!Number.isNaN(parsed)) {
      setSeed(parsed >>> 0);
      setShowCustomSeed(false);
      setCustomSeedInput("");
    }
  }

  return (
    <div class="modal-overlay">
      {/* biome-ignore lint/a11y/useSemanticElements: custom overlay requires div wrapper for backdrop */}
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h1 id="modal-title" class="modal-title">
          PETITIO PRINCIPII
        </h1>
        <p class="modal-subtitle">A text adventure through a self-justifying argument.</p>

        <div class="modal-seed-section">
          <div class="modal-phrase">{phrase()}</div>
          <div class="modal-seed-label">
            Seed: <span class="modal-seed-value">{seed()}</span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="modal-btn primary" onClick={() => props.onStart(seed())} type="button">
            BEGIN ARGUMENT
          </button>
          <button class="modal-btn secondary" onClick={handleRegenerate} type="button">
            REGENERATE
          </button>
          <button
            class="modal-btn tertiary"
            onClick={() => setShowCustomSeed(!showCustomSeed())}
            type="button"
          >
            CUSTOM SEED
          </button>
        </div>

        <Show when={showCustomSeed()}>
          <div class="modal-custom-seed">
            <input
              type="number"
              class="seed-input"
              value={customSeedInput()}
              onInput={(e) => setCustomSeedInput(e.currentTarget.value)}
              placeholder="Enter numeric seed..."
              aria-label="Custom seed input"
            />
            <button class="modal-btn secondary" onClick={handleCustomSeedSubmit} type="button">
              APPLY
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
};
