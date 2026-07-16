/**
 * Props for the FitLine component
 */
interface FitLineProps {
  /** Single word (or short phrase) to set on this line */
  text: string;
  /** Fill color for the type */
  fill: string;
}

/**
 * FitLine - One line of display type stretched edge-to-edge.
 *
 * The defining detail of the reference photo: every title line is justified
 * to fill the full card width, so short words ("IS") stretch wide and long
 * words compress. Plain CSS text cannot do this; SVG `textLength` with
 * `lengthAdjust="spacingAndGlyphs"` can.
 *
 * @example
 * ```tsx
 * <FitLine text="STAGE" fill="#f09ac0" />
 * ```
 */
export function FitLine({ text, fill }: FitLineProps): React.ReactElement {
  // Very short words ("IS", "IT", "A") would stretch into illegible blobs at
  // the full 100-unit width; cap their stretch like the reference photo does.
  const length = Math.min(100, Math.max(text.length * 34, 55));
  return (
    <svg
      viewBox="0 0 100 21"
      className="block w-full overflow-visible"
      aria-hidden="true"
    >
      <text
        x="0"
        y="20"
        textLength={length}
        lengthAdjust="spacingAndGlyphs"
        fontSize="27"
        fill={fill}
        style={{ fontFamily: "var(--font-archivo-black)" }}
      >
        {text}
      </text>
    </svg>
  );
}
