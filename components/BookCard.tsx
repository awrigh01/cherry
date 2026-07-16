import Link from "next/link";
import type { Book, PieceKind } from "@/lib/books";
import { FitLine } from "@/components/FitLine";
import { rotatedMeasureRatio, titleMaxSize } from "@/lib/type";

/** Physical thickness (px) of each piece kind's paper block. Every kind is
 * a proper book with a clearly visible page block, per the design. */
const THICKNESS: Record<PieceKind, number> = {
  flyer: 14,
  booklet: 17,
  stack: 20,
  thickBook: 30,
  blank: 16,
};

/** Warm paper-white for the page-block edges of piles and books. */
const PAGE_EDGE = "#f1efe9";

/**
 * Darken a hex color by a factor (0..1), for the shadowed edge walls.
 *
 * @param hex - Color like "#e8391d"
 * @param factor - 1 = unchanged, 0 = black
 * @returns Darkened rgb() color string
 */
const darken = (hex: string, factor: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Props for the Wordmark component
 */
interface WordmarkProps {
  /** Type/square color */
  color: string;
  /** Font size CSS value */
  size: string;
}

/**
 * Wordmark - The "CHERRY ■ NYC" brand mark, mirroring the photo's "PAC ■ NYC".
 *
 * @example
 * ```tsx
 * <Wordmark color="#141414" size="18px" />
 * ```
 */
function Wordmark({ color, size }: WordmarkProps): React.ReactElement {
  return (
    <span
      className="font-display whitespace-nowrap leading-none"
      style={{ color, fontSize: size }}
    >
      CHERRY
      <span
        className="mx-[0.22em] inline-block"
        style={{ width: "0.52em", height: "0.52em", background: color }}
      />
      NYC
    </span>
  );
}

/**
 * Props for the BookCard component
 */
interface BookCardProps {
  /** The derived book to render as a printed piece */
  book: Book;
}

/**
 * BookCard - One printed piece lying on the table, as a true 3D slab.
 *
 * Rather than faking depth with offset flat layers, each piece is a box in
 * the scene's preserve-3d space: the cover is lifted on the z-axis by the
 * piece's physical thickness, and real left/bottom edge walls connect it to
 * the table (those are the two faces visible from the camera angle). Page
 * piles and thick books get paper-white block edges; single sheets get thin
 * self-colored edges. A soft shadow is cast on the table underneath, offset
 * down-left from the upper-right light source. The whole piece links to its
 * open-spread page.
 *
 * @example
 * ```tsx
 * <BookCard book={getBook(7)} />
 * ```
 */
export function BookCard({ book }: BookCardProps): React.ReactElement {
  const { palette } = book;
  const isSmallCard = book.height < 120;
  const t = THICKNESS[book.kind];
  // Every piece shows a white paper page block under its cover; the bottom
  // edge sits in shadow so it reads a touch darker.
  const leftEdgeColor = PAGE_EDGE;
  const bottomEdgeColor = darken(PAGE_EDGE, 0.88);
  const shadow = [
    "0 1px 2px rgba(20, 20, 20, 0.14)",
    `${-4 - t}px ${5 + t}px ${12 + t * 1.5}px rgba(20, 20, 20, 0.18)`,
  ].join(", ");
  const rotationDeg =
    book.rotation === "ccw" ? -90 : book.rotation === "cw" ? 90 : 0;
  // Deterministic layout variation: center the type on some pieces,
  // start it at the top (below the caption) on others.
  const centered = book.jitterX >= 0;

  // Size the stacked title so every line fits the cover, whether the type
  // runs upright (measure = card width) or rotated 90deg (measure = height).
  const measureRatio =
    rotationDeg === 0
      ? (book.height * 0.8) / book.width
      : rotatedMeasureRatio(book.width, book.height);
  const maxSize = titleMaxSize(measureRatio, book.titleLines.length, book.lang);

  const titleBlock = (
    <div
      className={book.bleed ? "relative -ml-[9%] w-[118%]" : "relative w-full"}
    >
      {book.titleLines.map((line, index) => (
        <FitLine
          key={`${line}-${index}`}
          text={line}
          fill={palette.fg}
          maxSize={maxSize}
          lang={book.lang}
        />
      ))}
    </div>
  );

  return (
    <Link
      href={`/book/${book.id}`}
      className="book-card relative block [transform-style:preserve-3d]"
      style={{
        width: book.width,
        height: book.height,
        transform: `translate(${book.jitterX}px, ${book.jitterY}px)`,
      }}
    >
      {/* Shadow cast on the table at z=0, under the raised slab */}
      <div
        className="absolute inset-0"
        style={{ boxShadow: shadow, background: "rgba(20, 20, 20, 0.12)" }}
      />

      {/* Left edge wall of the paper block */}
      <div
        className="absolute left-0 top-0 h-full origin-left"
        style={{
          width: t,
          background: leftEdgeColor,
          transform: "rotateY(-90deg)",
        }}
      />

      {/* Bottom edge wall of the paper block */}
      <div
        className="absolute bottom-0 left-0 w-full origin-bottom"
        style={{
          height: t,
          background: bottomEdgeColor,
          transform: "rotateX(-90deg)",
        }}
      />

      {/* Cover face, lifted by the block's thickness */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          background: palette.bg,
          transform: `translateZ(${t}px)`,
        }}
      >
        {book.kind === "blank" || isSmallCard ? (
          <div
            className={`absolute inset-x-0 flex justify-center ${
              isSmallCard ? "top-1/2 -translate-y-1/2" : "top-[36%]"
            }`}
          >
            <Wordmark
              color={palette.fg}
              size={`${Math.round(book.width * 0.1)}px`}
            />
          </div>
        ) : rotationDeg === 0 ? (
          <div
            className="absolute inset-0 flex flex-col px-[7%] pb-[7%] pt-[13%]"
            style={{ justifyContent: centered ? "center" : "flex-start" }}
          >
            {titleBlock}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="shrink-0"
              style={{
                width: book.height * 0.86,
                transform: `rotate(${rotationDeg}deg)`,
              }}
            >
              {titleBlock}
            </div>
          </div>
        )}

        {/* Folded-booklet spine crease */}
        {book.kind === "booklet" && (
          <div className="absolute inset-y-0 left-0 w-[3px] bg-black/15" />
        )}

        {/* Tiny corner captions, like the small PAC / NYC marks */}
        {book.kind !== "blank" && !isSmallCard && (
          <>
            <span
              className="font-display absolute left-[6%] top-[4.5%] text-[10px] leading-none"
              style={{ color: palette.fg }}
            >
              CHERRY
            </span>
            <span
              className="font-display absolute bottom-[4.5%] right-[6%] text-[10px] leading-none"
              style={{ color: palette.fg }}
            >
              NYC
            </span>
          </>
        )}

        {/* Vertical published-date line on upright folded booklets */}
        {book.kind === "booklet" && rotationDeg === 0 && (
          <span
            className="font-display absolute bottom-[8%] right-[3%] origin-bottom-right -rotate-90 text-[9px] leading-none tracking-widest"
            style={{ color: palette.fg }}
          >
            PUBLISHED {book.year}
          </span>
        )}
      </div>
    </Link>
  );
}
