/**
 * VerbPanel — SCUMM-style rhetorical-verb panel.
 *
 * Inspired by Maniac Mansion / Day of the Tentacle interfaces: clear
 * grouping of verbs by intent so the player understands what each
 * button DOES, not just what it's labelled. Replaces the prior flat
 * 7-button row that conflated "Look" with "Examine" and "Question"
 * with "Ask Why" — distinct verbs that look interchangeable until
 * you've played long enough to understand the engine.
 *
 * Four groups, named for the player's intent:
 *
 *   OBSERVE — Look (room overview), Examine (close inspection)
 *   CHALLENGE — Question (poke a claim), Ask Why (demand justification)
 *   COMMIT — Accept (concede), Reject (refuse)
 *   MEMORY — Trace Back (revisit a prior premise)
 *
 * Each verb has: a glyph, a label (Yesteryear), a one-line subtitle
 * explaining what it actually does, and a group color. Disabled verbs
 * (not in `available`) render dim — no vanish, never yank capability.
 */
import type { ReactElement } from "react";
import {
  CheckIcon,
  EyeIcon,
  HelpCircleIcon,
  RotateCcwIcon,
  SearchIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";

export type VerbId = "look" | "examine" | "question" | "ask why" | "accept" | "reject" | "trace back";

type GroupId = "observe" | "challenge" | "commit" | "memory";

interface VerbDef {
  readonly id: VerbId;
  readonly label: string;
  readonly subtitle: string;
  readonly glyph: ReactElement;
  readonly group: GroupId;
}

const VERBS: ReadonlyArray<VerbDef> = [
  // OBSERVE
  { id: "look", label: "Look", subtitle: "take in the whole room", glyph: <EyeIcon size={14} aria-hidden />, group: "observe" },
  { id: "examine", label: "Examine", subtitle: "close inspection", glyph: <SearchIcon size={14} aria-hidden />, group: "observe" },
  // CHALLENGE
  { id: "question", label: "Question", subtitle: "poke a claim", glyph: <HelpCircleIcon size={14} aria-hidden />, group: "challenge" },
  { id: "ask why", label: "Ask Why", subtitle: "demand justification", glyph: <ZapIcon size={14} aria-hidden />, group: "challenge" },
  // COMMIT
  { id: "accept", label: "Accept", subtitle: "concede the point", glyph: <CheckIcon size={14} aria-hidden />, group: "commit" },
  { id: "reject", label: "Reject", subtitle: "refuse the point", glyph: <XIcon size={14} aria-hidden />, group: "commit" },
  // MEMORY
  { id: "trace back", label: "Trace Back", subtitle: "revisit a prior premise", glyph: <RotateCcwIcon size={14} aria-hidden />, group: "memory" },
];

const GROUP_LABEL: Record<GroupId, string> = {
  observe: "Observe",
  challenge: "Challenge",
  commit: "Commit",
  memory: "Memory",
};

/** Group color tokens — each group gets a distinct visual identity. */
const GROUP_TINT: Record<GroupId, string> = {
  observe: "var(--color-silver)",
  challenge: "var(--color-violet-bright)",
  commit: "var(--color-pink)",
  memory: "var(--color-dim)",
};

export interface VerbPanelProps {
  /** Verb labels currently surfaced (from computeKeycapSurface). */
  readonly available: ReadonlySet<string>;
  /** Optional set of verbs to highlight as `primary` (one most plausibly useful). */
  readonly primary?: ReadonlySet<string>;
  readonly onVerb: (verb: VerbId) => void;
}

export function VerbPanel({ available, primary, onVerb }: VerbPanelProps) {
  const groups: ReadonlyArray<GroupId> = ["observe", "challenge", "commit", "memory"];
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
      {groups.map((g) => {
        const verbsInGroup = VERBS.filter((v) => v.group === g);
        return (
          <fieldset
            key={g}
            className="m-0 flex flex-col gap-1.5 border-0 p-0"
            aria-label={GROUP_LABEL[g]}
          >
            <legend
              className="mb-1 px-1 font-[family-name:var(--font-display)] text-[0.65rem] tracking-[0.24em] uppercase"
              style={{ color: GROUP_TINT[g], opacity: 0.7 }}
            >
              {GROUP_LABEL[g]}
            </legend>
            {verbsInGroup.map((v) => {
              const isAvailable = available.has(v.id);
              const isPrimary = primary?.has(v.id) ?? false;
              return (
                <button
                  key={v.id}
                  type="button"
                  data-variant="verb"
                  aria-label={`${v.label} — ${v.subtitle}`}
                  disabled={!isAvailable}
                  onClick={() => onVerb(v.id)}
                  className={`
                    flex flex-col items-start gap-0.5
                    rounded-[4px] border px-2 py-1.5
                    text-left
                    transition-all duration-150
                    disabled:opacity-30 disabled:cursor-not-allowed
                  `}
                  style={{
                    borderColor: isPrimary ? GROUP_TINT[g] : "var(--color-panel-edge)",
                    background: isPrimary ? `color-mix(in srgb, ${GROUP_TINT[g]} 12%, transparent)` : "transparent",
                    boxShadow: isPrimary ? `0 0 12px color-mix(in srgb, ${GROUP_TINT[g]} 40%, transparent)` : undefined,
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <span style={{ color: GROUP_TINT[g] }} aria-hidden>{v.glyph}</span>
                    <span
                      className="font-[family-name:var(--font-incantation)] text-[1.05rem] leading-none"
                      style={{ color: isAvailable ? "var(--color-highlight)" : "var(--color-muted)" }}
                    >
                      {v.label}
                    </span>
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-[0.65rem] tracking-[0.04em] text-[var(--color-muted)] leading-tight">
                    {v.subtitle}
                  </span>
                </button>
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
}
