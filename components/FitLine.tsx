import { CAP_ADVANCE, MAX_SIZE, MIN_SIZE, titleMaxSize } from "@/lib/type";

// Re-exported so existing imports of the fit math keep working.
export { titleMaxSize };

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
  // maxSize (the container fit budget) is applied last so it always wins,
  // even over the preferred minimum.
  const fontSize = Math.min(maxSize, Math.max(MIN_SIZE, estimated));
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
