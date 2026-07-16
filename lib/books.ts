/**
 * Deterministic procedural book generator.
 *
 * Every book is derived purely from its numeric id, so the infinite table can
 * page through `getBooks(offset, limit)` forever and the detail page can
 * re-derive the exact same book from the URL with no database.
 */

import {
  ROTATED_MIN_SIZE,
  rotatedMeasureRatio,
  titleMaxSize,
} from "@/lib/type";

/** Physical kind of printed piece, mirroring the reference photo. */
export type PieceKind = "flyer" | "booklet" | "stack" | "thickBook" | "blank";

/** Orientation of the cover typography. */
export type TitleRotation = "upright" | "cw" | "ccw";

/** Color pairing for a printed piece (background + type color). */
export interface Palette {
  /** Card/background color */
  bg: string;
  /** Display type color */
  fg: string;
}

/** A fully derived book. */
export interface Book {
  /** Stable numeric id (also the URL segment) */
  id: number;
  /** Cover title, one word per line */
  titleLines: string[];
  /** Title joined with spaces, for metadata and the spread page */
  title: string;
  /** Generated author name */
  author: string;
  /** Publication year */
  year: number;
  /** One-paragraph generated blurb for the open spread */
  blurb: string;
  /** Color pairing */
  palette: Palette;
  /** Physical piece kind */
  kind: PieceKind;
  /** Cover type orientation */
  rotation: TitleRotation;
  /** Whether the type oversizes and clips at the card edge */
  bleed: boolean;
  /** Piece width on the table plane, in px */
  width: number;
  /** Piece height on the table plane, in px */
  height: number;
  /** Loose-grid jitter offsets, in px */
  jitterX: number;
  jitterY: number;
}

/** Small seeded PRNG (mulberry32) so book n is always the same book. */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = <T,>(rand: () => number, items: readonly T[]): T =>
  items[Math.floor(rand() * items.length)];

/** Columns of the table grid; kind/palette mixing is arranged per row. */
export const GRID_COLS = 10;

/**
 * Color pairings for the covers. Yellow and orange each appear twice for
 * weighting; with 12 entries and the (3, 4) grid strides below, touching
 * cells only ever differ by {1, 3, 4, 5, 7, 8, 9, 11} mod 12, so duplicates
 * placed 6 apart can never land on two touching books.
 */
const PALETTES: readonly Palette[] = [
  { bg: "#f2e400", fg: "#141414" }, // yellow + black (most frequent)
  { bg: "#ff6600", fg: "#ffa9d2" }, // bright orange + bright pink
  { bg: "#ffffff", fg: "#d63c2e" }, // white + flat red
  { bg: "#0051ff", fg: "#ffffff" }, // primary blue + white
  { bg: "#0d8a3c", fg: "#141414" }, // kelly green + black
  { bg: "#e6007e", fg: "#ffffff" }, // magenta + white
  { bg: "#f2e400", fg: "#141414" },
  { bg: "#ff6600", fg: "#f2e400" }, // bright orange + yellow
  { bg: "#b9d4ea", fg: "#141414" }, // powder blue + black
  { bg: "#e30613", fg: "#ffffff" }, // primary red + white
  { bg: "#141414", fg: "#a8c6e8" }, // black + light blue
  { bg: "#b9a3e3", fg: "#141414" }, // lavender + black
];

/**
 * Cover copy banks, in the spirit of Maya Man's FAKE IT TILL YOU MAKE IT:
 * Instagram wellness / girlboss mantra language, collage-able, tipping from
 * cliché into absurd — still living in a cherry orchard.
 */
const NOUNS = [
  "CHERRY",
  "ORCHARD",
  "PIT",
  "STEM",
  "BLOSSOM",
  "JAM",
  "PIE",
  "BASKET",
  "HARVEST",
  "ERA",
  "GLOW",
  "VIBE",
  "SOFTNESS",
  "MOOD",
] as const;

const VERBS = [
  "MANIFEST",
  "ROMANTICIZE",
  "PROTECT",
  "FAKE",
  "HEAL",
  "CRAVE",
  "DESERVE",
  "SCARE",
  "SOFTLAUNCH",
  "CURATE",
] as const;

/** Pen names for the inside page — cherry varieties, no given name. */
const CHERRY_VARIETIES = [
  "BING",
  "RAINIER",
  "MORELLO",
  "LAMBERT",
  "MONTMORENCY",
  "AMARENA",
  "SKEENA",
  "LAPINS",
  "STELLA",
  "CHELAN",
  "TIETON",
  "REGINA",
] as const;

const ADJECTIVES = [
  "RIPE",
  "SOFT",
  "DELUSIONAL",
  "TOXIC",
  "SWEET",
  "UNBOTHERED",
  "MAIN",
  "PRETTY",
  "HEALING",
  "CHAOTIC",
  "STOLEN",
  "PERFECT",
] as const;

/** If two slot words collide, replace the second with its bank neighbor. */
const shiftIfEqual = (
  value: string,
  other: string,
  bank: readonly string[],
): string =>
  value === other ? bank[(bank.indexOf(value) + 1) % bank.length] : value;

interface TitleTemplate {
  /** Word banks feeding this template's slots, in order */
  banks: readonly (readonly string[])[];
  /** Assemble the title lines from the drawn slot words */
  build: (words: string[]) => string[];
}

/** Mantra-shaped title templates — short, uppercase, a little unhinged. */
const TEMPLATES: readonly TitleTemplate[] = [
  {
    banks: [ADJECTIVES, NOUNS],
    build: ([a, n]) => ["YOU", "DESERVE", "EVERY", a, n],
  },
  {
    banks: [VERBS],
    build: ([v]) => ["FAKE", "IT", "TILL", "YOU", v, "IT"],
  },
  {
    banks: [ADJECTIVES],
    build: ([a]) => ["MAIN", "CHARACTER", "IN", "THE", a, "ORCHARD"],
  },
  {
    banks: [NOUNS],
    build: ([n]) => ["STOP", "APOLOGIZING", "FOR", "THE", n],
  },
  {
    banks: [ADJECTIVES],
    build: ([a]) => ["YOUR", "BEST", "LIFE", "IS", a],
  },
  {
    banks: [ADJECTIVES, NOUNS],
    build: ([a, n]) => ["SOFT", "GIRL", a, n],
  },
  {
    banks: [VERBS, NOUNS],
    build: ([v, n]) => [v, "THE", n],
  },
  {
    banks: [ADJECTIVES, NOUNS],
    build: ([a, n]) => ["BE", a, "ABOUT", n],
  },
  {
    banks: [ADJECTIVES, ADJECTIVES],
    build: ([a, b]) => [a, "BUT", shiftIfEqual(b, a, ADJECTIVES)],
  },
  {
    banks: [NOUNS],
    build: ([n]) => ["MANIFEST", "A", n],
  },
  {
    banks: [ADJECTIVES, NOUNS],
    build: ([a, n]) => ["THAT", "GIRL", "EATS", a, n],
  },
  {
    banks: [VERBS, NOUNS],
    build: ([v, n]) => [v, "YOUR", n, "ENERGY"],
  },
  {
    banks: [ADJECTIVES, NOUNS],
    build: ([a, n]) => [a, "AND", n],
  },
  {
    banks: [NOUNS],
    build: ([n]) => ["CHERRY", "GIRL", n, "FOREVER"],
  },
  {
    banks: [NOUNS],
    build: ([n]) => ["LOVE", "YOURSELF", "LOUDER", "THAN", "THE", n],
  },
  {
    banks: [NOUNS],
    build: ([n]) => ["HEALING", "IS", "A", n],
  },
  {
    banks: [NOUNS],
    build: ([n]) => ["NO", "THOUGHTS", "JUST", n],
  },
  {
    banks: [NOUNS],
    build: ([n]) => ["BE", "THE", n, "THEY", "CAN'T", "HAVE"],
  },
  {
    banks: [ADJECTIVES],
    build: ([a]) => ["YOUR", "GLOW", "IS", a],
  },
  {
    banks: [ADJECTIVES, ADJECTIVES],
    build: ([a, b]) => [a, "AND", shiftIfEqual(b, a, ADJECTIVES)],
  },
  {
    banks: [NOUNS],
    build: ([n]) => ["SCARE", "THEM", "WITH", "YOUR", n],
  },
  {
    banks: [NOUNS],
    build: ([n]) => ["PRETTY", "GIRLS", "EAT", "THE", "WHOLE", n],
  },
  {
    banks: [ADJECTIVES, NOUNS],
    build: ([a, n]) => ["THIS", "IS", "YOUR", a, n],
  },
  {
    banks: [VERBS],
    build: ([v]) => ["TOUCH", "GRASS", v, "CHERRIES"],
  },
  {
    banks: [NOUNS, NOUNS],
    build: ([x, y]) => ["BOUNDARIES", "AND", shiftIfEqual(y, x, NOUNS)],
  },
  {
    banks: [ADJECTIVES],
    build: ([a]) => ["YOU'RE", "NOT", "TOO", "MUCH", "YOU'RE", a],
  },
  {
    banks: [NOUNS],
    build: ([n]) => ["CRINGE", "IS", "A", n],
  },
  {
    banks: [ADJECTIVES, NOUNS],
    build: ([a, n]) => ["LIVE", "LAUGH", a, n],
  },
];

/** Decompose a combination index into one word per bank. */
const slotValues = (
  idx: number,
  banks: readonly (readonly string[])[],
): string[] => {
  const words: string[] = [];
  let rest = idx;
  for (const bank of banks) {
    words.push(bank[rest % bank.length]);
    rest = Math.floor(rest / bank.length);
  }
  return words;
};

/** Walk a template set deterministically: templates cycle by `key`; within
 * a template, draws stride through the full combination space with a prime
 * coprime to its size, pushing title repeats as far out as the banks allow. */
const titleFrom = (
  key: number,
  templates: readonly TitleTemplate[],
): string[] => {
  const t = key % templates.length;
  const k = Math.floor(key / templates.length);
  const { banks, build } = templates[t];
  const total = banks.reduce((acc, bank) => acc * bank.length, 1);
  const stride = [37, 41, 43].find((p) => total % p !== 0) ?? 1;
  return build(slotValues((k * stride + t * 11) % total, banks));
};

/** Deterministic English title for book `id`. */
const buildTitle = (id: number): string[] => titleFrom(id, TEMPLATES);

const OPENERS = [
  "A soft-launch field guide to wanting more cherries",
  "Part self-help, part orchard delusion",
  "The main-character edit of one impossible harvest",
  "Notes from the comments section under a cherry tree",
  "A wellness retreat that never left the picnic blanket",
  "An affirmation deck for girls who stain their fingers",
] as const;

const MIDDLES = [
  "collaged from captions almost posted then deleted",
  "told in bubble type and slightly unhinged confidence",
  "written like a story you'd screenshot and never reread",
  "traced through nine soft launches and one hard jam",
  "recorded between the last glow-up and the first frost",
  "assembled from mantras that sound true until they don't",
] as const;

const CLOSERS = [
  "Manifest the last cherry. Then eat it.",
  "Protect your stem energy.",
  "You're not too much. You're ripe.",
  "Romanticize the pit.",
  "Fake it till you pick it.",
  "No thoughts. Just jam.",
] as const;

interface SizeVariant {
  width: number;
  height: number;
}

/**
 * Size variants per piece kind (px on the table plane), chosen by grid
 * position rather than randomly: `variant` advances with both column and
 * row, so neighboring pieces of the same kind always land on different
 * shapes.
 */
const sizeFor = (variant: number, kind: PieceKind): SizeVariant => {
  const of = <T,>(items: readonly T[]): T => items[variant % items.length];
  switch (kind) {
    case "flyer":
      return of([
        { width: 215, height: 300 }, // portrait flyer
        { width: 255, height: 182 }, // landscape flyer
        { width: 178, height: 305 }, // tall narrow flyer
      ] as const);
    case "booklet":
      return of([
        { width: 228, height: 320 },
        { width: 208, height: 277 },
      ] as const);
    case "stack":
      return of([
        { width: 212, height: 273 }, // letterhead pile
        { width: 156, height: 92 }, // business cards
      ] as const);
    case "thickBook":
      return { width: 272, height: 362 };
    case "blank":
      return { width: 218, height: 282 };
  }
};

/**
 * One row's worth of piece kinds: flyers alternate with the rarer kinds, so
 * every row is guaranteed a full mix (one stack, one thick book, one blank,
 * two booklets, five flyers) with no two rare kinds side by side. The
 * pattern rotates 3 per row, so columns vary too and identical kinds never
 * stack vertically.
 */
const ROW_KINDS: readonly PieceKind[] = [
  "flyer",
  "booklet",
  "flyer",
  "stack",
  "flyer",
  "thickBook",
  "flyer",
  "booklet",
  "flyer",
  "blank",
];

/**
 * Derive book `id` deterministically.
 *
 * @param id - Non-negative book index
 * @returns The same `Book` for the same `id`, always
 *
 * @example
 * ```typescript
 * const book = getBook(42)
 * ```
 */
export const getBook = (id: number): Book => {
  const rand = mulberry32((id + 1) * 0x9e3779b9);
  const col = id % GRID_COLS;
  const row = Math.floor(id / GRID_COLS);
  const kind = ROW_KINDS[(col + row * 3) % GRID_COLS];
  const titleLines = buildTitle(id);
  const author = pick(rand, CHERRY_VARIETIES);
  const year = 1995 + Math.floor(rand() * 32);
  const blurb = `${pick(rand, OPENERS)}, ${pick(rand, MIDDLES)}. ${pick(rand, CLOSERS)}`;

  // Palettes walk the grid with strides (3 across, 4 down) chosen so no two
  // touching books — horizontally, vertically, or diagonally — share one.
  // Blank pieces are the near-empty letterhead / business-card wordmark ones.
  const palette: Palette =
    kind === "blank"
      ? pick(rand, [
          { bg: "#ffffff", fg: "#141414" },
          { bg: "#141414", fg: "#ffffff" },
        ] as const)
      : PALETTES[(col * 3 + row * 4) % PALETTES.length];

  const rotationRoll = rand();
  const bleedRoll = rand();
  const base = sizeFor(col + row, kind);
  // Per-book scale wobble (+/-8%) so even same-variant pieces a few cells
  // apart don't read as identical sizes.
  const scale = 0.92 + rand() * 0.16;
  const width = Math.round(base.width * scale);
  const height = Math.round(base.height * scale);

  // Rotated type sets its measure along the card's long axis but budgets its
  // stack depth on the short one, so long titles on portrait cards clamp
  // tiny and letter-space out into a gappy mess. Only rotate when the fitted
  // size stays at display scale; otherwise the title runs upright, where
  // measure and budget are proportioned correctly.
  const rotatedFit = titleMaxSize(
    rotatedMeasureRatio(width, height),
    titleLines.length,
  );
  const rotation: TitleRotation =
    rotatedFit < ROTATED_MIN_SIZE || rotationRoll < 0.6
      ? "upright"
      : rotationRoll < 0.85
        ? "ccw"
        : "cw";

  // Bleed only pairs with upright type: combined with a 90deg rotation it
  // crops the title on every edge instead of one deliberate side.
  const bleed =
    (kind === "flyer" || kind === "booklet") &&
    rotation === "upright" &&
    bleedRoll < 0.25;

  return {
    id,
    titleLines,
    title: titleLines.join(" "),
    author,
    year,
    blurb,
    palette,
    kind,
    rotation,
    bleed,
    width,
    height,
    jitterX: Math.floor(rand() * 60) - 30,
    jitterY: Math.floor(rand() * 60) - 30,
  };
};

/**
 * Page through the infinite catalog.
 *
 * @param offset - First book index
 * @param limit - Number of books to return
 * @returns Books `offset` through `offset + limit - 1`
 */
export const getBooks = (offset: number, limit: number): Book[] =>
  Array.from({ length: limit }, (_, i) => getBook(offset + i));
