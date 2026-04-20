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
  const [customSeedError, setCustomSeedError] = createSignal("");

  const phrase = createMemo(() => generatePhrase(seed()));

  function handleRegenerate() {
    setSeed(generateSeed());
    setCustomSeedInput("");
    setCustomSeedError("");
    setShowCustomSeed(false);
  }

  function handleCustomSeedSubmit(e?: Event) {
    if (e) e.preventDefault();
    const parsed = Number.parseInt(customSeedInput(), 10);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 0xffffffff) {
      setCustomSeedError("Seed must be between 0 and 4294967295");
    } else {
      setCustomSeedError("");
      setSeed(parsed);
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
          <form
            class="modal-custom-seed"
            onSubmit={handleCustomSeedSubmit}
          >
            <div style={{ display: "flex", "flex-direction": "column", gap: "4px" }}>
              <input
                type="number"
                class="seed-input"
                value={customSeedInput()}
                onInput={(e) => setCustomSeedInput(e.currentTarget.value)}
                placeholder="Enter numeric seed..."
                aria-label="Custom seed input"
                min="0"
                max="4294967295"
              />
              <Show when={customSeedError()}>
                <span style={{ color: "red", "font-size": "0.8em" }}>{customSeedError()}</span>
              </Show>
            </div>
            <button class="modal-btn secondary" type="submit">
              APPLY
            </button>
          </form>
        </Show>
      </div>
    </div>
  );
};
