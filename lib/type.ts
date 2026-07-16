/**
 * Shared display-type metrics for the stacked cover titles.
 *
 * Lives in lib/ (not the FitLine component) because the book generator also
 * needs the fit math: whether a title may rotate 90deg depends on whether
 * the rotated stack still sets at a legible size.
 *
 * Metrics are per script: Latin titles set in Archivo Black (all caps, tight
 * leading), Hindi titles in Anek Devanagari 800 (aksharas carry headstroke
 * matras above and descenders below, so they need a taller line box).
 */

/** Script a title is set in. */
export type TitleLang = "en" | "hi";

/** Largest and smallest per-line font sizes (viewBox units, width = 100). */
export const MAX_SIZE = 34;
export const MIN_SIZE = 15;
/** Smallest fitted size at which a title is still allowed to rotate 90deg;
 * below this the rotated stack reads as cramped filler, not display type. */
export const ROTATED_MIN_SIZE = 20;

/** Approximate average glyph advance per visual unit, in em: Latin caps of
 * Archivo Black vs Devanagari aksharas of Anek Devanagari 800. */
export const CAP_ADVANCE: Record<TitleLang, number> = { en: 0.68, hi: 0.72 };

/** Line height per font-size unit. Latin: cap height 0.72 x 1.08 leading.
 * Devanagari: a full em, leaving room for matras and descenders. */
export const LINE_RATIO: Record<TitleLang, number> = {
  en: 0.72 * 1.08,
  hi: 1.0,
};

/**
 * Width-relevant glyph count of a title word. Devanagari vowel signs,
 * viramas, and nuktas combine onto their base consonant without advancing
 * the line, so they are stripped before counting ("चेरी" counts 2, not 4).
 *
 * @param text - One title line
 * @param lang - Script the line is set in
 * @returns Number of advancing glyphs, for width estimation
 */
export const visualLength = (text: string, lang: TitleLang): number =>
  lang === "hi"
    ? text.replace(/[\u0900-\u0903\u093A-\u094D\u0951-\u0957\u0962\u0963]/g, "")
        .length
    : text.length;

/**
 * Largest per-line size that lets a stacked title fit its container.
 *
 * @param heightOverWidth - Container aspect as height / width
 * @param lineCount - Number of title lines
 * @param lang - Script (determines line height)
 * @param fraction - Share of the container height the title may occupy
 * @returns Max font size in FitLine viewBox units, clamped to sane bounds
 *
 * @example
 * ```typescript
 * const maxSize = titleMaxSize(300 / 215, 5, "en")
 * ```
 */
export const titleMaxSize = (
  heightOverWidth: number,
  lineCount: number,
  lang: TitleLang = "en",
  fraction = 0.82,
): number => {
  const budget = heightOverWidth * 100 * fraction;
  // No lower clamp here: fitting the container always wins over the
  // preferred minimum size, otherwise many-line titles overflow the cover.
  return Math.min(MAX_SIZE, budget / (lineCount * LINE_RATIO[lang]));
};

/**
 * Aspect ratio (height / width) of a title stack rotated 90deg on a cover:
 * the measure runs along the card's height, the stack depth along its width.
 * Must match the rotated layout in BookCard (0.8 usable width, 0.86-height
 * measure).
 *
 * @param width - Cover width in px
 * @param height - Cover height in px
 * @returns Ratio to feed titleMaxSize for the rotated orientation
 */
export const rotatedMeasureRatio = (width: number, height: number): number =>
  (width * 0.8) / (height * 0.86);
