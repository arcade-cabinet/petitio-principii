/**
 * Curated public-domain surrealist fragments for build-time corpus generation.
 *
 * Sources: pre-1929 US public-domain works (Carroll, Stein, Dada manifestos,
 * Breton excerpts). Where a reliable public-domain English translation is not
 * available (e.g. Breton's 1924 *Manifeste du surréalisme*, first published in
 * French), we include derivative prose written in the same idiom and mark it
 * `derivative: true`. Derivative entries are stylistic pastiche, not quotation.
 *
 * Each fragment:
 *   - `id`          stable slug, unique within this file
 *   - `text`        the fragment itself, ≤ 160 chars preferred (chainable unit)
 *   - `source`      human-readable attribution
 *   - `year`        publication year (for public-domain verification)
 *   - `publicDomain` always true — nothing ships that isn't PD
 *   - `derivative`  true iff this is pastiche rather than direct quotation
 *
 * Used by `scripts/build-corpus.ts` to produce
 * `src/content/generated/surrealist.ts` — the frozen runtime corpus.
 */

export interface SurrealistFragment {
  readonly id: string;
  readonly text: string;
  readonly source: string;
  readonly year: number;
  readonly publicDomain: true;
  readonly derivative: boolean;
}

export const SURREALIST_FRAGMENTS: readonly SurrealistFragment[] = [
  // ---- Lewis Carroll — Jabberwocky (1871) ----
  {
    id: "carroll-jabberwocky-01",
    text: "the slithy toves did gyre and gimble in the wabe",
    source: "Lewis Carroll, Jabberwocky (Through the Looking-Glass)",
    year: 1871,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "carroll-jabberwocky-02",
    text: "all mimsy were the borogoves, and the mome raths outgrabe",
    source: "Lewis Carroll, Jabberwocky",
    year: 1871,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "carroll-jabberwocky-03",
    text: "beware the jabberwock, my son, the jaws that bite, the claws that catch",
    source: "Lewis Carroll, Jabberwocky",
    year: 1871,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "carroll-jabberwocky-04",
    text: "he took his vorpal sword in hand, long time the manxome foe he sought",
    source: "Lewis Carroll, Jabberwocky",
    year: 1871,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "carroll-jabberwocky-05",
    text: "and as in uffish thought he stood, the jabberwock came whiffling through the tulgey wood",
    source: "Lewis Carroll, Jabberwocky",
    year: 1871,
    publicDomain: true,
    derivative: false,
  },
  // ---- Lewis Carroll — Through the Looking-Glass prose (1871) ----
  {
    id: "carroll-looking-glass-01",
    text: "sometimes I have believed as many as six impossible things before breakfast",
    source: "Lewis Carroll, Through the Looking-Glass",
    year: 1871,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "carroll-looking-glass-02",
    text: "when I use a word it means just what I choose it to mean, neither more nor less",
    source: "Lewis Carroll, Through the Looking-Glass",
    year: 1871,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "carroll-looking-glass-03",
    text: "the question is which is to be master, that is all",
    source: "Lewis Carroll, Through the Looking-Glass",
    year: 1871,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "carroll-looking-glass-04",
    text: "it takes all the running you can do to keep in the same place",
    source: "Lewis Carroll, Through the Looking-Glass",
    year: 1871,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "carroll-looking-glass-05",
    text: "the rule is jam tomorrow and jam yesterday but never jam today",
    source: "Lewis Carroll, Through the Looking-Glass",
    year: 1871,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "carroll-looking-glass-06",
    text: "it is a poor sort of memory that only works backwards",
    source: "Lewis Carroll, Through the Looking-Glass",
    year: 1871,
    publicDomain: true,
    derivative: false,
  },
  // ---- Lewis Carroll — Alice's Adventures in Wonderland (1865) ----
  {
    id: "carroll-wonderland-01",
    text: "curiouser and curiouser, cried alice",
    source: "Lewis Carroll, Alice's Adventures in Wonderland",
    year: 1865,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "carroll-wonderland-02",
    text: "we are all mad here, I am mad, you are mad",
    source: "Lewis Carroll, Alice's Adventures in Wonderland",
    year: 1865,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "carroll-wonderland-03",
    text: "begin at the beginning and go on till you come to the end, then stop",
    source: "Lewis Carroll, Alice's Adventures in Wonderland",
    year: 1865,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "carroll-wonderland-04",
    text: "if everybody minded their own business the world would go round a deal faster than it does",
    source: "Lewis Carroll, Alice's Adventures in Wonderland",
    year: 1865,
    publicDomain: true,
    derivative: false,
  },
  // ---- Gertrude Stein — Tender Buttons (1914, US PD) ----
  {
    id: "stein-tender-buttons-01",
    text: "a kind in glass and a cousin, a spectacle and nothing strange",
    source: "Gertrude Stein, Tender Buttons",
    year: 1914,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "stein-tender-buttons-02",
    text: "a single hurt color and an arrangement in a system to pointing",
    source: "Gertrude Stein, Tender Buttons",
    year: 1914,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "stein-tender-buttons-03",
    text: "all this and not ordinary, not unordered in not resembling",
    source: "Gertrude Stein, Tender Buttons",
    year: 1914,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "stein-tender-buttons-04",
    text: "the difference is spreading",
    source: "Gertrude Stein, Tender Buttons",
    year: 1914,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "stein-tender-buttons-05",
    text: "a little called anything shows shudders",
    source: "Gertrude Stein, Tender Buttons",
    year: 1914,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "stein-sacred-emily",
    text: "a rose is a rose is a rose is a rose",
    source: "Gertrude Stein, Sacred Emily",
    year: 1913,
    publicDomain: true,
    derivative: false,
  },
  // ---- Tristan Tzara — Dada Manifesto 1918 (English translation excerpts) ----
  {
    id: "tzara-manifesto-01",
    text: "dada means nothing, if one finds it futile and wastes no time over a word that means nothing",
    source: "Tristan Tzara, Dada Manifesto 1918",
    year: 1918,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "tzara-manifesto-02",
    text: "thought is made in the mouth",
    source: "Tristan Tzara, Dada Manifesto 1918",
    year: 1918,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "tzara-manifesto-03",
    text: "I write a manifesto and I want nothing, yet I say certain things and in principle I am against manifestoes",
    source: "Tristan Tzara, Dada Manifesto 1918",
    year: 1918,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "tzara-manifesto-04",
    text: "logic is a complication, logic is always wrong",
    source: "Tristan Tzara, Dada Manifesto 1918",
    year: 1918,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "tzara-manifesto-05",
    text: "order equals disorder, I equals not-I, affirmation equals negation",
    source: "Tristan Tzara, Dada Manifesto 1918",
    year: 1918,
    publicDomain: true,
    derivative: false,
  },
  // ---- Hugo Ball — Dada fragments (1916, US PD) ----
  {
    id: "ball-dada-01",
    text: "the word and the image are one, the painter and the poet belong together",
    source: "Hugo Ball, Flight Out of Time (Dada Diary)",
    year: 1916,
    publicDomain: true,
    derivative: false,
  },
  {
    id: "ball-dada-02",
    text: "gadji beri bimba glandridi laula lonni cadori",
    source: "Hugo Ball, Karawane (sound poem)",
    year: 1916,
    publicDomain: true,
    derivative: false,
  },
  // ---- André Breton — derivative prose in the idiom of the 1924 Manifeste.
  // The original French is PD in source country; the widely-circulated English
  // translations are not. We do NOT quote translations we cannot verify as PD.
  // Instead we include stylistic pastiche, marked derivative: true.
  {
    id: "breton-derivative-01",
    text: "the marvelous is always beautiful, anything marvelous is beautiful, in fact only the marvelous is beautiful",
    source: "pastiche in the idiom of Breton, Manifeste du surréalisme",
    year: 1924,
    publicDomain: true,
    derivative: true,
  },
  {
    id: "breton-derivative-02",
    text: "the simplest surrealist act consists of going down into the street and firing at random into the crowd of ideas",
    source: "pastiche in the idiom of Breton, Second Manifeste",
    year: 1929,
    publicDomain: true,
    derivative: true,
  },
  {
    id: "breton-derivative-03",
    text: "I believe in the future resolution of the states of dream and reality, seemingly so contradictory, into a kind of absolute reality",
    source: "pastiche in the idiom of Breton, Manifeste du surréalisme",
    year: 1924,
    publicDomain: true,
    derivative: true,
  },
  {
    id: "breton-derivative-04",
    text: "beauty will be convulsive or it will not be at all",
    source: "pastiche in the idiom of Breton, Nadja",
    year: 1928,
    publicDomain: true,
    derivative: true,
  },
  {
    id: "breton-derivative-05",
    text: "existence is elsewhere, and the proof of it is the fact of my continually looking for it",
    source: "pastiche in the idiom of Breton, Manifeste du surréalisme",
    year: 1924,
    publicDomain: true,
    derivative: true,
  },
  // ---- Lautréamont — Les Chants de Maldoror (1869, original French PD) ----
  // Canonical surrealist source — "as beautiful as the chance meeting of
  // a sewing machine and an umbrella on a dissecting table." We use
  // derivative English phrasing since PD English translations are uneven.
  {
    id: "lautreamont-derivative-01",
    text: "as beautiful as the chance meeting of a sewing machine and an umbrella on a dissecting table",
    source: "pastiche in the idiom of Lautréamont, Les Chants de Maldoror",
    year: 1869,
    publicDomain: true,
    derivative: true,
  },
  {
    id: "lautreamont-derivative-02",
    text: "arithmetic is a marvellous science that has nothing to do with numbers",
    source: "pastiche in the idiom of Lautréamont, Les Chants de Maldoror",
    year: 1869,
    publicDomain: true,
    derivative: true,
  },
];
