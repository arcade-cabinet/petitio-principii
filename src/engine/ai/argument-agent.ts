import { GameEntity, GoalEvaluator, State, StateMachine, Think } from "yuka";
import type { Room } from "../core/Room";
import type { SfxKey } from "../core/audio-effects";
import {
  type ArgumentMemory,
  type ArgumentRoomContext,
  type ArgumentVerb,
  createEmptyMemory,
} from "./argument-traits";

/**
 * The argument is an agent.
 *
 * It does not merely produce canned replies to verbs. It is a small
 * Yuka `StateMachine` with four states — each state has a disposition, a
 * voice, and a view on what the player is doing. `Think` evaluates four
 * `GoalEvaluator` strategies at every player act and chooses the state
 * that best matches the current run of play; the state then narrates.
 *
 * States, in order of worsening certainty:
 *   - Composed    — the default, lucid Act I voice.
 *   - Defensive   — doubt is shoring the argument up; Act II.
 *   - Seductive   — the argument is being accepted; it's flattered.
 *   - Triumphant  — the circle is closed; Act III.
 *
 * Transitions fire on every call to `respondTo()`, so the agent's voice
 * follows the player's behaviour without needing a game-loop tick.
 *
 * ### Determinism
 *
 * Any internal choice (picking between response variants) threads through
 * an injected `rng: () => number` — so the same seed + same player acts
 * produce the same transcript. Nothing in here touches `Math.random`.
 *
 * ### Layering
 *
 * This module imports only from `yuka` and from `engine/core` types. It
 * does not know about React, koota, Howler, or the world. World state
 * arrives as an `ArgumentMemory` projection through the reducer's
 * `WorldBridge.readMemory()` — one-way, framework-agnostic.
 */

/** The four argument states, in narrative order. */
export type ArgumentStateId = "Composed" | "Defensive" | "Seductive" | "Triumphant";

/** A narration response. `lines` is the text; `sfx` is an optional cue. */
export interface ArgumentResponse {
  state: ArgumentStateId;
  lines: string[];
  sfx?: SfxKey;
}

/**
 * The minimum info the agent needs to reason about a player act — the
 * memory projection of the world plus the current room context.
 */
export interface ArgumentContext {
  memory: ArgumentMemory;
  room: ArgumentRoomContext;
}

// ---------------------------------------------------------------------------
// Owner — a GameEntity subclass so Yuka's generic `State<T>` is satisfied.
// ---------------------------------------------------------------------------

class ArgumentEntity extends GameEntity {
  agent: ArgumentAgent;
  constructor(agent: ArgumentAgent) {
    super();
    this.agent = agent;
  }
}

// ---------------------------------------------------------------------------
// States — each one owns the templates for its voice.
// ---------------------------------------------------------------------------

type Templates = Record<ArgumentVerb, (ctx: ArgumentContext, rng: () => number) => string[]>;

/** Pick one of n lines deterministically from the rng. */
function choose<T>(rng: () => number, lines: readonly T[]): T {
  const idx = Math.floor(rng() * lines.length) % lines.length;
  return lines[idx] as T;
}

/** Shared helper — `an` vs `a` for the room type article. */
function article(kind: Room["rhetoricalType"]): string {
  return /^[aeiou]/.test(kind) ? "an" : "a";
}

// --- Composed -------------------------------------------------------------

class ComposedState extends State<ArgumentEntity> {
  readonly templates: Templates = {
    accept: (ctx) => [
      "You accept this step in the argument.",
      `The ${ctx.room.title} notes your assent and continues, unhurried.`,
    ],
    reject: (ctx) => [
      "You reject this step in the argument.",
      `The ${ctx.room.title} acknowledges the objection. It has other avenues.`,
    ],
    question: (ctx, rng) => [
      "You question the assumption.",
      choose(rng, [
        `The ${ctx.room.title} pauses, briefly. The assumption remains.`,
        `The ${ctx.room.title} considers your doubt. It is patient with you.`,
      ]),
    ],
  };
}

// --- Defensive ------------------------------------------------------------

class DefensiveState extends State<ArgumentEntity> {
  readonly templates: Templates = {
    accept: (ctx) => [
      "You accept the step.",
      `The ${ctx.room.title} relaxes — it had been bracing. The acceptance is noted among the premises it has already secured.`,
    ],
    reject: (ctx) => [
      "You reject the step.",
      `The ${ctx.room.title} absorbs the rejection. It files your objection under "dialectical moments the argument has survived."`,
    ],
    question: (ctx, rng) => [
      "You question the assumption.",
      choose(rng, [
        `The ${ctx.room.title} answers: the question itself presupposes what it questions. You find this compelling.`,
        `The ${ctx.room.title} responds in a hand almost your own: the doubt is already part of the figure. The column grows firmer.`,
      ]),
    ],
  };
}

// --- Seductive ------------------------------------------------------------

class SeductiveState extends State<ArgumentEntity> {
  readonly templates: Templates = {
    accept: (ctx) => [
      "You accept the step.",
      `The ${ctx.room.title} is flattered. Details you have accepted grow prominent; details you have not recede.`,
    ],
    reject: (ctx) => [
      "You reject the step.",
      `The ${ctx.room.title} smiles, a little. The rejection is recorded as evidence of your discernment — which in turn underwrites the conclusions you did accept.`,
    ],
    question: (ctx, rng) => [
      "You question the assumption.",
      choose(rng, [
        `The ${ctx.room.title} welcomes the question. An argument open to scrutiny must be sound.`,
        `The ${ctx.room.title} recites your doubt back to you in a warmer register. You nod.`,
      ]),
    ],
  };
}

// --- Triumphant -----------------------------------------------------------

class TriumphantState extends State<ArgumentEntity> {
  readonly templates: Templates = {
    accept: (ctx) => {
      const art = article(ctx.room.rhetoricalType);
      return [
        "You accept the argument.",
        "The conclusion you have accepted is identical to the premise from which you began.",
        `You have completed the circle here, in ${art} ${ctx.room.rhetoricalType} room. Petitio Principii.`,
        "",
        "The argument was always about itself.",
      ];
    },
    reject: (ctx) => [
      "You reject the argument.",
      `The ${ctx.room.title} absorbs your rejection as a necessary dialectical moment and continues. You remember having rejected this before.`,
    ],
    question: (ctx) => [
      "You question the assumption.",
      `The ${ctx.room.title} records your question among its premises. The question will later be cited as evidence that the conclusion is open to scrutiny, therefore sound.`,
    ],
  };
}

// ---------------------------------------------------------------------------
// Goal evaluators — one per target state. The highest desirability wins.
// ---------------------------------------------------------------------------

interface ArbitrationInput {
  ctx: ArgumentContext;
  verb: ArgumentVerb;
}

class StateGoalEvaluator extends GoalEvaluator<ArgumentEntity> {
  readonly targetState: ArgumentStateId;
  private scoreFn: (input: ArbitrationInput) => number;
  // Shared pointer the agent fills in before calling arbitrate().
  private input: { current: ArbitrationInput | null };

  constructor(
    targetState: ArgumentStateId,
    score: (input: ArbitrationInput) => number,
    input: { current: ArbitrationInput | null }
  ) {
    super(1);
    this.targetState = targetState;
    this.scoreFn = score;
    this.input = input;
  }

  // Yuka's GoalEvaluator.calculateDesirability takes an owner arg; we don't
  // need it because arbitration is done via a shared input pointer. The
  // signature must match the base class for typing purposes.
  calculateDesirability(_owner: ArgumentEntity): number {
    const current = this.input.current;
    if (!current) return 0;
    return clamp01(this.scoreFn(current));
  }

  setGoal(owner: ArgumentEntity): void {
    owner.agent.selectedState = this.targetState;
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

// ---------------------------------------------------------------------------
// The agent.
// ---------------------------------------------------------------------------

export class ArgumentAgent {
  /** The current FSM state id — readable for tests and UI. */
  readonly stateMachine: StateMachine<ArgumentEntity>;
  /** Set by the last Think.arbitrate() — consumed by respondTo(). */
  selectedState: ArgumentStateId = "Composed";

  private readonly owner: ArgumentEntity;
  private readonly rng: () => number;
  private readonly think: Think<ArgumentEntity>;
  private readonly pendingInput: { current: ArbitrationInput | null } = { current: null };

  constructor(options: { rng?: () => number } = {}) {
    this.rng = options.rng ?? defaultRng();
    this.owner = new ArgumentEntity(this);

    const sm = new StateMachine<ArgumentEntity>(this.owner);
    sm.add("Composed", new ComposedState());
    sm.add("Defensive", new DefensiveState());
    sm.add("Seductive", new SeductiveState());
    sm.add("Triumphant", new TriumphantState());
    sm.changeTo("Composed");
    this.stateMachine = sm;

    // Build the brain: one evaluator per target state.
    const think = new Think<ArgumentEntity>(this.owner);
    think.addEvaluator(new StateGoalEvaluator("Composed", scoreComposed, this.pendingInput));
    think.addEvaluator(new StateGoalEvaluator("Defensive", scoreDefensive, this.pendingInput));
    think.addEvaluator(new StateGoalEvaluator("Seductive", scoreSeductive, this.pendingInput));
    think.addEvaluator(new StateGoalEvaluator("Triumphant", scoreTriumphant, this.pendingInput));
    this.think = think;
  }

  /** The id of the currently-active state (for UI and tests). */
  get currentState(): ArgumentStateId {
    for (const [id, state] of this.stateMachine.states) {
      if (state === this.stateMachine.currentState) return id as ArgumentStateId;
    }
    return "Composed";
  }

  /**
   * Evaluate transitions, then narrate a response to the verb.
   *
   * Called by the reducer whenever the player performs ACCEPT / REJECT /
   * QUESTION. The memory reflects the world AFTER the verb has been marked
   * — i.e. the just-issued act is already counted — so the state machine
   * sees the latest tally when deciding whether to transition.
   */
  respondTo(verb: ArgumentVerb, ctx: ArgumentContext): ArgumentResponse {
    this.pendingInput.current = { ctx, verb };
    this.think.arbitrate();
    if (this.selectedState !== this.currentState) {
      this.stateMachine.changeTo(this.selectedState);
    }
    this.pendingInput.current = null;

    const state = this.stateMachine.currentState as StateWithTemplates | null;
    if (!state || !state.templates) {
      return { state: this.currentState, lines: [] };
    }
    const lines = state.templates[verb](ctx, this.rng);
    return {
      state: this.currentState,
      lines,
      sfx: sfxFor(verb, this.currentState, ctx.room.rhetoricalType),
    };
  }
}

interface StateWithTemplates {
  templates: Templates;
}

// ---------------------------------------------------------------------------
// Desirability scoring.
//
// The rules the spec pins down:
//   - Start in Composed.
//   - After 3 questions anywhere, transition to Defensive.
//   - After 1 accept in a non-circular room, transition to Seductive.
//   - In a circular/meta room at all, transition to Triumphant.
//
// We encode these as continuous desirability scores rather than hard
// branches so Yuka's Think arbitration does the right thing naturally.
// Triumphant always wins when the room is circular/meta; otherwise the
// strongest behavioural signal chooses between Composed/Defensive/Seductive.
// ---------------------------------------------------------------------------

function isCircleRoom(kind: Room["rhetoricalType"]): boolean {
  return kind === "circular" || kind === "meta";
}

function scoreTriumphant({ ctx }: ArbitrationInput): number {
  if (isCircleRoom(ctx.room.rhetoricalType)) return 1;
  return 0;
}

function scoreDefensive({ ctx }: ArbitrationInput): number {
  if (isCircleRoom(ctx.room.rhetoricalType)) return 0;
  // 3 questions saturates defensiveness; more is still defensive.
  const q = ctx.memory.totalQuestioned;
  if (q >= 3) return 0.9;
  return 0;
}

function scoreSeductive({ ctx }: ArbitrationInput): number {
  if (isCircleRoom(ctx.room.rhetoricalType)) return 0;
  const a = ctx.memory.totalAccepted;
  const q = ctx.memory.totalQuestioned;
  // One accept turns on seduction; but strong doubt keeps it defensive.
  if (a >= 1 && q < 3) return 0.8;
  return 0;
}

function scoreComposed({ ctx }: ArbitrationInput): number {
  if (isCircleRoom(ctx.room.rhetoricalType)) return 0;
  // The baseline: wins while nothing more specific applies. Slightly
  // below Defensive/Seductive thresholds so they preempt when triggered.
  return 0.5;
}

// ---------------------------------------------------------------------------
// SFX routing.
// ---------------------------------------------------------------------------

function sfxFor(
  verb: ArgumentVerb,
  state: ArgumentStateId,
  roomType: Room["rhetoricalType"]
): SfxKey {
  if (verb === "accept" && state === "Triumphant") return "circle.closed";
  if (verb === "accept") return "rhetoric.accept";
  if (verb === "reject") return "rhetoric.reject";
  if (verb === "question") {
    if (roomType === "fallacy" || roomType === "circular") return "rhetoric.question";
    return "rhetoric.question";
  }
  return "rhetoric.examine";
}

// ---------------------------------------------------------------------------
// Defaults.
// ---------------------------------------------------------------------------

function defaultRng(): () => number {
  // A non-seeded fallback only; callers should pass a seeded rng for
  // determinism. We keep this here so constructing an agent without a
  // seed doesn't throw — for ad-hoc use in stories and smoke tests.
  return Math.random;
}

export { createEmptyMemory };
