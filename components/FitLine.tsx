/** Approximate average cap advance of Archivo Black, in em. */
const CAP_ADVANCE = 0.68;
/** Largest and smallest per-line font sizes (viewBox units, width = 100). */
const MAX_SIZE = 34;
const MIN_SIZE = 15;
/** Line height per font-size unit (cap height 0.72 x 1.08 leading). */
const LINE_RATIO = 0.72 * 1.08;

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
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, budget / (lineCount * LINE_RATIO)));
};

/**
 * Props for the FitLine component
 */
interface FitLineProps {
  /** Single word (or short phrase) to set on this line */
  text: string;
  /** Fill color for the type */
  fill: string;
  /** Upper bound for this line's font size (see titleMaxSize) */
  maxSize?: number;
}

/**
 * FitLine - One line of display type justified edge-to-edge.
 *
 * The defining detail of the reference photo: every title line fills the full
 * card width, so each line gets its own point size — short words set huge,
 * long words compact. The size is estimated from the word's length, then SVG
 * `textLength` trues up the fit (mild glyph adjustment only, since the size
 * already lands close). Very short words ("A", "IS") cap at the max size and
 * stretch wide with bounded distortion, centered in the measure, matching
 * the photo's hyper-extended short lines.
 *
 * @example
 * ```tsx
 * <FitLine text="CHERRY" fill="#f09ac0" />
 * ```
 */
export function FitLine({
  text,
  fill,
  maxSize = MAX_SIZE,
}: FitLineProps): React.ReactElement {
  const estimated = 100 / (CAP_ADVANCE * text.length);
  const fontSize = Math.max(MIN_SIZE, Math.min(maxSize, estimated));
  // When capped (short words), stretch up to 2.2x natural width instead of
  // forcing a grotesque full-bleed distortion.
  const naturalWidth = CAP_ADVANCE * fontSize * text.length;
  const length = Math.min(100, naturalWidth * 2.2);
  const capHeight = fontSize * 0.72;
  const lineHeight = capHeight * 1.08; // tight leading, lines nearly touching

  return (
    <svg
      viewBox={`0 0 100 ${lineHeight}`}
      className="block w-full overflow-visible"
      aria-hidden="true"
    >
      <text
        x={(100 - length) / 2}
        y={capHeight}
        textLength={length}
        lengthAdjust="spacingAndGlyphs"
        fontSize={fontSize}
        fill={fill}
        style={{ fontFamily: "var(--font-archivo-black)" }}
      >
        {text}
      </text>
    </svg>
  );
}
