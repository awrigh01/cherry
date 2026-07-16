import {
  CAP_ADVANCE,
  LINE_RATIO,
  MAX_SIZE,
  MIN_SIZE,
  titleMaxSize,
  visualLength,
  type TitleLang,
} from "@/lib/type";

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
  /** Script the line is set in (picks font, metrics, and leading) */
  lang?: TitleLang;
}

/**
 * FitLine - One line of display type justified edge-to-edge.
 *
 * The defining detail of the reference photo: every title line fills the full
 * card width, so each line gets its own point size — short words set huge,
 * long words compact. The size is estimated from the word's visual glyph
 * count, then SVG `textLength` trues up the fit (mild glyph adjustment only,
 * since the size already lands close). Very short words ("A", "IS") cap at
 * the max size and stretch wide with bounded distortion, centered in the
 * measure, matching the photo's hyper-extended short lines.
 *
 * Latin lines set in Archivo Black caps; Hindi lines in Anek Devanagari 800,
 * on a taller line box that leaves room for matras and descenders.
 *
 * @example
 * ```tsx
 * <FitLine text="CHERRY" fill="#f09ac0" />
 * <FitLine text="चेरी" fill="#141414" lang="hi" />
 * ```
 */
export function FitLine({
  text,
  fill,
  maxSize = MAX_SIZE,
  lang = "en",
}: FitLineProps): React.ReactElement {
  const advance = CAP_ADVANCE[lang];
  const glyphs = visualLength(text, lang);
  const estimated = 100 / (advance * glyphs);
  // maxSize (the container fit budget) is applied last so it always wins,
  // even over the preferred minimum.
  const fontSize = Math.min(maxSize, Math.max(MIN_SIZE, estimated));
  // When capped (short words), stretch up to 2.2x natural width instead of
  // forcing a grotesque full-bleed distortion.
  const naturalWidth = advance * fontSize * glyphs;
  const length = Math.min(100, naturalWidth * 2.2);
  // Baseline inside the line box: Latin sits at cap height; Devanagari a
  // touch lower so descenders keep clear of the next line's headstroke.
  const baseline = lang === "hi" ? fontSize * 0.75 : fontSize * 0.72;
  const lineHeight = fontSize * LINE_RATIO[lang];

  return (
    <svg
      viewBox={`0 0 100 ${lineHeight}`}
      className="block w-full overflow-visible"
      aria-hidden="true"
    >
      <text
        x={(100 - length) / 2}
        y={baseline}
        textLength={length}
        lengthAdjust="spacingAndGlyphs"
        fontSize={fontSize}
        fill={fill}
        style={{
          fontFamily:
            lang === "hi"
              ? "var(--font-devanagari)"
              : "var(--font-archivo-black)",
        }}
      >
        {text}
      </text>
    </svg>
  );
}
