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
  type TitleLang,
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
  /** Script the cover title is set in */
  lang: TitleLang;
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

/** Rows in the opening view (both breakpoints, plus early drift) where black
 * covers are excluded so the ink masthead always reads against the table. */
const MASTHEAD_ROWS = 15;

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

/** Hindi word banks, split by grammatical gender so adjective templates
 * agree (feminine forms pair with feminine nouns). */
const HI_NOUNS_FEM = [
  "चेरी", // cherry
  "टोकरी", // basket
  "डाली", // branch
  "गुठली", // pit
  "फ़सल", // harvest
  "कहानी", // story
  "चाँदनी", // moonlight
  "बग़िया", // little garden
] as const;

const HI_NOUNS_MASC = [
  "बाग़", // orchard
  "पेड़", // tree
  "मुरब्बा", // jam
  "गीत", // song
  "मेला", // fair
  "सफ़र", // journey
] as const;

const HI_ADJECTIVES = [
  "मीठी", // sweet
  "खट्टी", // sour
  "जंगली", // wild
  "पकी", // ripe
  "पहली", // first
  "आख़िरी", // last
  "लाल", // red
  "काली", // dark
  "ताज़ी", // fresh
  "रसीली", // juicy
] as const;

const HI_VERBS = [
  "खाओ", // eat
  "तोड़ो", // pick
  "बाँटो", // share
  "चखो", // taste
  "उगाओ", // grow
  "बचाओ", // save
] as const;

/** Slogan-shaped Hindi templates, same Aru-and-cherries world. */
const TEMPLATES_HI: readonly TitleTemplate[] = [
  {
    banks: [HI_ADJECTIVES, HI_NOUNS_FEM],
    build: ([a, n]) => ["आरू", "और", a, n], // Aru and the sweet cherry
  },
  {
    banks: [HI_ADJECTIVES],
    build: ([a]) => [a, "चेरी", "का", "मौसम"], // season of ripe cherries
  },
  {
    banks: [HI_NOUNS_MASC],
    build: ([n]) => ["आरू", "का", n], // Aru's orchard
  },
  {
    banks: [HI_ADJECTIVES, HI_NOUNS_FEM],
    build: ([a, n]) => [a, n, "आरू", "के", "लिए"], // a sweet cherry for Aru
  },
  {
    banks: [HI_NOUNS_FEM, HI_VERBS],
    build: ([n, v]) => [n, v], // eat cherries
  },
  {
    banks: [HI_VERBS, HI_VERBS],
    build: ([a, b]) => [a, "और", shiftIfEqual(b, a, HI_VERBS)], // pick and share
  },
  {
    banks: [HI_ADJECTIVES, HI_NOUNS_FEM],
    build: ([a, n]) => ["हर", n, a, "है"], // every cherry is sweet
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

/** Every 3rd book gets a Hindi title; the rest are English. Each language
 * walks its own template cycle (keys count only that language's books) so
 * the mix stays deterministic and repeat-resistant. */
const buildTitle = (id: number): { lines: string[]; lang: TitleLang } =>
  id % 3 === 1
    ? { lines: titleFrom(Math.floor(id / 3), TEMPLATES_HI), lang: "hi" }
    : {
        lines: titleFrom(id - Math.floor((id + 1) / 3), TEMPLATES),
        lang: "en",
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
  const { lines: titleLines, lang } = buildTitle(id);
  const author = `ARU ${pick(rand, CHERRY_VARIETIES)}`;
  const year = 1995 + Math.floor(rand() * 32);
  const blurb = `${pick(rand, OPENERS)}, ${pick(rand, MIDDLES)}. ${pick(rand, CLOSERS)}`;

  // Palettes walk the grid with strides (3 across, 4 down) chosen so no two
  // touching books — horizontally, vertically, or diagonally — share one.
  // Blank pieces are the near-empty letterhead / business-card wordmark ones.
  // Within the masthead rows, black covers swap 6 palette slots ahead (a
  // spacing no two touching cells can have, so the swap can't create an
  // adjacent duplicate) and blank cards stay white.
  const paletteIndex = (col * 3 + row * 4) % PALETTES.length;
  let palette: Palette =
    kind === "blank"
      ? pick(rand, [
          { bg: "#ffffff", fg: "#141414" },
          { bg: "#141414", fg: "#ffffff" },
        ] as const)
      : PALETTES[paletteIndex];
  if (row < MASTHEAD_ROWS && palette.bg === "#141414") {
    palette =
      kind === "blank"
        ? { bg: "#ffffff", fg: "#141414" }
        : PALETTES[(paletteIndex + 6) % PALETTES.length];
  }

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
    lang,
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
    lang,
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
