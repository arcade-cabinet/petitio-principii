import { useState } from "react";
import { generatePhrase } from "../../engine/core/NarrativeGenerator";
import { generateSeed } from "../../engine/prng/seedRandom";

interface ModalNewGameProps {
  onStart: (seed: number) => void;
}

export function ModalNewGame({ onStart }: ModalNewGameProps) {
  const [seed, setSeed] = useState<number>(() => generateSeed());
  const [customSeedInput, setCustomSeedInput] = useState("");
  const [showCustomSeed, setShowCustomSeed] = useState(false);

  const phrase = generatePhrase(seed);

  function handleRegenerate() {
    setSeed(generateSeed());
    setCustomSeedInput("");
    setShowCustomSeed(false);
  }

  function handleCustomSeedSubmit() {
    const parsed = Number.parseInt(customSeedInput, 10);
    if (!Number.isNaN(parsed)) {
      setSeed(parsed >>> 0);
      setShowCustomSeed(false);
      setCustomSeedInput("");
    }
  }

  function handleStart() {
    onStart(seed);
  }

  return (
    <div className="modal-overlay">
      {/* biome-ignore lint/a11y/useSemanticElements: custom overlay requires div wrapper for backdrop */}
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h1 id="modal-title" className="modal-title">
          PETITIO PRINCIPII
        </h1>
        <p className="modal-subtitle">A text adventure through a self-justifying argument.</p>

        <div className="modal-seed-section">
          <div className="modal-phrase">{phrase}</div>
          <div className="modal-seed-label">
            Seed: <span className="modal-seed-value">{seed}</span>
          </div>
        </div>

        <div className="modal-actions">
          <button className="modal-btn primary" onClick={handleStart} type="button">
            BEGIN ARGUMENT
          </button>
          <button className="modal-btn secondary" onClick={handleRegenerate} type="button">
            REGENERATE
          </button>
          <button
            className="modal-btn tertiary"
            onClick={() => setShowCustomSeed(!showCustomSeed)}
            type="button"
          >
            CUSTOM SEED
          </button>
        </div>

        {showCustomSeed && (
          <div className="modal-custom-seed">
            <input
              type="number"
              className="seed-input"
              value={customSeedInput}
              onChange={(e) => setCustomSeedInput(e.target.value)}
              placeholder="Enter numeric seed..."
              aria-label="Custom seed input"
            />
            <button className="modal-btn secondary" onClick={handleCustomSeedSubmit} type="button">
              APPLY
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
