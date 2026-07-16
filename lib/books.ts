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
  "STAGE",
  "PAGE",
  "STORY",
  "INK",
  "PAPER",
  "SPINE",
  "PLOT",
  "CHAPTER",
  "MARGIN",
  "COVER",
  "SHELF",
  "WORD",
  "BOOK",
  "LIBRARY",
  "READER",
] as const;

const VERBS = [
  "READ",
  "WRITE",
  "LISTEN",
  "GATHER",
  "SING",
  "SHARE",
  "DREAM",
  "LEARN",
  "LOVE",
  "BEGIN",
  "LAUGH",
  "WANDER",
] as const;

const FIRST_NAMES = [
  "ADA",
  "MILO",
  "JUNE",
  "OTTO",
  "VERA",
  "LENA",
  "HUGO",
  "IRIS",
  "EZRA",
  "NOOR",
  "KAI",
  "RUTH",
] as const;

const LAST_NAMES = [
  "MARCH",
  "BELL",
  "CALLOWAY",
  "OKAFOR",
  "LINDGREN",
  "VOSS",
  "TANAKA",
  "MERCER",
  "ADEYEMI",
  "HOLT",
  "NAKAMURA",
  "FINCH",
] as const;

/** Slogan-shaped title templates in the spirit of the reference photo. */
const buildTitle = (rand: () => number): string[] => {
  const n = (): string => pick(rand, NOUNS);
  const v = (): string => pick(rand, VERBS);
  const templates: readonly (() => string[])[] = [
    () => ["OUR", n(), "IS", "YOUR", n()],
    () => ["SEE", "YOU", "AT", "THE", n()],
    () => ["FROM", "THE", n(), "FOR", "THE", "WORLD"],
    () => [v(), v(), v(), v()],
    () => ["THE", n(), "IS", "NOT", "DEAD"],
    () => [v(), "IT", "TWICE"],
    () => ["EVERY", n(), "A", "DOOR"],
    () => ["WE", "SAVED", "A", n(), "FOR", "YOU"],
    () => ["THIS", "IS", "YOUR", n()],
    () => [n(), "AFTER", n()],
    () => ["A", n(), "FOR", "EVERY", "ONE"],
    () => [v(), "AND", v()],
  ];
  return pick(rand, templates)();
};

const OPENERS = [
  "A field guide to reading in public",
  "Part manifesto, part love letter to print",
  "An unhurried walk through the stacks",
  "A pocket history of borrowed books",
  "A loud argument for quiet rooms",
  "Notes collected from a thousand margins",
] as const;

const MIDDLES = [
  "set across one long summer of library fines and folded corners",
  "told in dog-eared chapters and pencil underlines",
  "written on the backs of overdue slips",
  "assembled from index cards found in a secondhand atlas",
  "traced through nine cities and one impossible bookshop",
  "recorded between the last page and the bus stop",
] as const;

const CLOSERS = [
  "It asks only that you read it twice.",
  "Bring a pencil. You will want to underline.",
  "The ending is different every time you arrive at it.",
  "Best read aloud, ideally to a stranger.",
  "It was never supposed to leave the shelf.",
  "Every copy is the first edition of someone.",
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
  const titleLines = buildTitle(rand);
  const author = `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`;
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

  const bleed = (kind === "flyer" || kind === "booklet") && rand() < 0.25;
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
