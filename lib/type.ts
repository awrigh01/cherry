/**
 * Shared display-type metrics for the stacked cover titles.
 *
 * Lives in lib/ (not the FitLine component) because the book generator also
 * needs the fit math: whether a title may rotate 90deg depends on whether
 * the rotated stack still sets at a legible size.
 */

/** Approximate average cap advance of Archivo Black, in em. */
export const CAP_ADVANCE = 0.68;
/** Largest and smallest per-line font sizes (viewBox units, width = 100). */
export const MAX_SIZE = 34;
export const MIN_SIZE = 15;
/** Smallest fitted size at which a title is still allowed to rotate 90deg;
 * below this the rotated stack reads as cramped filler, not display type. */
export const ROTATED_MIN_SIZE = 20;
/** Line height per font-size unit (cap height 0.72 x 1.08 leading). */
export const LINE_RATIO = 0.72 * 1.08;

/**
 * Largest per-line size that lets a stacked title fit its container.
 *
 * @param heightOverWidth - Container aspect as height / width
 * @param lineCount - Number of title lines
 * @param fraction - Share of the container height the title may occupy
 * @returns Max font size in FitLine viewBox units, clamped to sane bounds
 *
 * @example
 * ```typescript
 * const maxSize = titleMaxSize(300 / 215, 5)
 * ```
 */
export const titleMaxSize = (
  heightOverWidth: number,
  lineCount: number,
  fraction = 0.82,
): number => {
  const budget = heightOverWidth * 100 * fraction;
  // No lower clamp here: fitting the container always wins over the
  // preferred minimum size, otherwise many-line titles overflow the cover.
  return Math.min(MAX_SIZE, budget / (lineCount * LINE_RATIO));
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
