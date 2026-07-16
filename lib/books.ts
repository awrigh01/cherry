/**
 * Deterministic procedural book generator.
 *
 * Every book is derived purely from its numeric id, so the infinite table can
 * page through `getBooks(offset, limit)` forever and the detail page can
 * re-derive the exact same book from the URL with no database.
 */

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

/** Color pairings sampled from the reference photo, repeated for weighting. */
const PALETTES: readonly Palette[] = [
  { bg: "#e8391d", fg: "#f09ac0" }, // red + pink
  { bg: "#e8391d", fg: "#f09ac0" },
  { bg: "#ffffff", fg: "#e8391d" }, // white + red
  { bg: "#ffffff", fg: "#e8391d" },
  { bg: "#0d8a3c", fg: "#141414" }, // kelly green + black
  { bg: "#e6007e", fg: "#ffffff" }, // magenta + white
  { bg: "#f2e400", fg: "#141414" }, // yellow + black (most frequent)
  { bg: "#f2e400", fg: "#141414" },
  { bg: "#141414", fg: "#a8c6e8" }, // black + light blue
  { bg: "#b9a3e3", fg: "#141414" }, // lavender + black
];

const NOUNS = [
  "CHERRY",
  "ORCHARD",
  "PIT",
  "STEM",
  "BLOSSOM",
  "JAM",
  "PIE",
  "TREE",
  "BASKET",
  "HARVEST",
  "GROVE",
  "PICNIC",
] as const;

const VERBS = [
  "PICK",
  "TASTE",
  "PLANT",
  "SHARE",
  "CLIMB",
  "DREAM",
  "SNACK",
  "WANDER",
  "SAVOR",
  "GATHER",
] as const;

/** Every book is authored by an Aru; surnames are cherry varieties. */
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
  "SWEET",
  "SOUR",
  "WILD",
  "RIPE",
  "DARK",
  "STOLEN",
  "SECRET",
  "LAST",
  "FIRST",
  "PERFECT",
] as const;

const TIMES = [
  "MIDNIGHT",
  "DAWN",
  "NOON",
  "DUSK",
  "SUNRISE",
  "SUPPER",
  "HARVEST",
  "MIDSUMMER",
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

/** Slogan-shaped title templates, all about Aru and cherries. */
const TEMPLATES: readonly TitleTemplate[] = [
  { banks: [ADJECTIVES, NOUNS], build: (w) => ["ARU", "EATS", "EVERY", ...w] },
  {
    banks: [NOUNS, NOUNS],
    build: ([x, y]) => ["OUR", x, "IS", "YOUR", shiftIfEqual(y, x, NOUNS)],
  },
  {
    banks: [ADJECTIVES, NOUNS],
    build: (w) => ["SEE", "ARU", "AT", "THE", ...w],
  },
  {
    banks: [ADJECTIVES, NOUNS],
    build: ([a, n]) => ["FROM", "THE", a, n, "FOR", "ARU"],
  },
  {
    banks: [VERBS, VERBS, VERBS, VERBS],
    build: ([a, b, c, d]) => {
      const second = shiftIfEqual(b, a, VERBS);
      const third = shiftIfEqual(c, second, VERBS);
      return [a, second, third, shiftIfEqual(d, third, VERBS)];
    },
  },
  {
    banks: [NOUNS, NOUNS],
    build: ([x, y]) => ["NO", x, "NO", shiftIfEqual(y, x, NOUNS)],
  },
  { banks: [ADJECTIVES, NOUNS], build: (w) => ["ARU", "LOVES", ...w] },
  { banks: [ADJECTIVES, NOUNS], build: (w) => ["ARU", "AND", "THE", ...w] },
  { banks: [ADJECTIVES, NOUNS], build: (w) => ["ARU", "SAVED", "THE", ...w] },
  {
    banks: [ADJECTIVES, NOUNS],
    build: ([a, n]) => ["THIS", "IS", a, n, "SEASON"],
  },
  {
    banks: [NOUNS, NOUNS],
    build: ([x, y]) => [x, "AFTER", shiftIfEqual(y, x, NOUNS)],
  },
  {
    banks: [ADJECTIVES, NOUNS],
    build: ([a, n]) => ["A", a, n, "FOR", "ARU"],
  },
  {
    banks: [ADJECTIVES, TIMES],
    build: ([a, t]) => [a, "CHERRIES", "AT", t],
  },
  { banks: [ADJECTIVES, NOUNS], build: (w) => ["THE", ...w, "CLUB"] },
  {
    banks: [VERBS, TIMES],
    build: ([v, t]) => ["ARU", `${v}S`, "AT", t],
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

/**
 * Deterministic title for book `id`, with repeats pushed out as far as the
 * word banks allow. Templates cycle by id; within a template, draws walk the
 * full combination space with a stride coprime to its size, so a title can
 * only repeat after every combination (80 to 10,000 per template) is used.
 */
const buildTitle = (id: number): string[] => {
  const t = id % TEMPLATES.length;
  const k = Math.floor(id / TEMPLATES.length);
  const { banks, build } = TEMPLATES[t];
  const total = banks.reduce((acc, bank) => acc * bank.length, 1);
  const stride = [37, 41, 43].find((p) => total % p !== 0) ?? 1;
  return build(slotValues((k * stride + t * 11) % total, banks));
};

const OPENERS = [
  "A field guide to cherry picking with Aru",
  "Part manifesto, part love letter to the orchard",
  "The true story of Aru and one impossible cherry tree",
  "An unhurried walk through the grove with Aru",
  "Notes collected from the bottom of Aru's cherry basket",
  "A loud argument for cherries at breakfast",
] as const;

const MIDDLES = [
  "set across one long summer of stained fingers and spat pits",
  "told in dog-eared chapters and cherry-stem bookmarks",
  "written on the backs of jam-jar labels",
  "traced through nine orchards and one impossible pie contest",
  "recorded between the last blossom and the first frost",
  "assembled from postcards Aru never mailed",
] as const;

const CLOSERS = [
  "Aru asks only that you save the last cherry.",
  "Bring napkins. You will need them.",
  "The pie is different every time you arrive at it.",
  "Best read aloud under a cherry tree.",
  "It was never supposed to leave the orchard.",
  "Every cherry is the first cherry of someone.",
] as const;

interface SizeVariant {
  width: number;
  height: number;
}

/** Size variants per piece kind (px on the table plane). */
const sizeFor = (rand: () => number, kind: PieceKind): SizeVariant => {
  switch (kind) {
    case "flyer":
      return pick(rand, [
        { width: 215, height: 300 }, // portrait flyer
        { width: 255, height: 182 }, // landscape flyer
        { width: 178, height: 305 }, // tall narrow flyer
      ] as const);
    case "booklet":
      return pick(rand, [
        { width: 228, height: 320 },
        { width: 208, height: 277 },
      ] as const);
    case "stack":
      return pick(rand, [
        { width: 212, height: 273 }, // letterhead pile
        { width: 156, height: 92 }, // business cards
      ] as const);
    case "thickBook":
      return { width: 272, height: 362 };
    case "blank":
      return { width: 218, height: 282 };
  }
};

/** Weighted piece kinds; flyers dominate like the photo. */
const KINDS: readonly PieceKind[] = [
  "flyer",
  "flyer",
  "flyer",
  "flyer",
  "flyer",
  "booklet",
  "booklet",
  "stack",
  "stack",
  "thickBook",
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
  const kind = pick(rand, KINDS);
  const titleLines = buildTitle(id);
  const author = `ARU ${pick(rand, CHERRY_VARIETIES)}`;
  const year = 1995 + Math.floor(rand() * 32);
  const blurb = `${pick(rand, OPENERS)}, ${pick(rand, MIDDLES)}. ${pick(rand, CLOSERS)}`;

  // Blank pieces are the near-empty letterhead / business-card wordmark ones.
  const palette: Palette =
    kind === "blank"
      ? pick(rand, [
          { bg: "#ffffff", fg: "#141414" },
          { bg: "#141414", fg: "#ffffff" },
        ] as const)
      : pick(rand, PALETTES);

  const rotationRoll = rand();
  const rotation: TitleRotation =
    rotationRoll < 0.6 ? "upright" : rotationRoll < 0.85 ? "ccw" : "cw";

  // Bleed only pairs with upright type: combined with a 90deg rotation it
  // crops the title on every edge instead of one deliberate side.
  const bleed =
    (kind === "flyer" || kind === "booklet") &&
    rotation === "upright" &&
    rand() < 0.25;
  const { width, height } = sizeFor(rand, kind);

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
