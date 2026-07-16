import Link from "next/link";
import type { Book } from "@/lib/books";
import { FitLine } from "@/components/FitLine";

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
 * BookCard - One printed piece lying on the table.
 *
 * Renders the book's physical kind (flyer, folded booklet, sheet stack,
 * thick book, or blank wordmark piece), its justified stacked-type cover via
 * `FitLine`, optional +/-90 degree type rotation, edge-bleed clipping, tiny
 * corner captions, and a soft shadow cast down-left (light source upper
 * right, as in the reference photo). The whole piece links to its spread.
 *
 * @example
 * ```tsx
 * <BookCard book={getBook(7)} />
 * ```
 */
export function BookCard({ book }: BookCardProps): React.ReactElement {
  const { palette } = book;
  const isSmallCard = book.height < 120;
  const thick = book.kind === "thickBook" || book.kind === "stack";
  // Layered shadows like the photo: a tight contact shadow hugging the sheet,
  // a mid falloff, and a wide soft ambient — all cast down-left (light source
  // upper right). Thick pieces sit higher, so their ambient is larger.
  const shadow = thick
    ? [
        "0 1px 2px rgba(20, 20, 20, 0.14)",
        "-6px 8px 10px rgba(20, 20, 20, 0.12)",
        "-20px 26px 42px rgba(20, 20, 20, 0.20)",
      ].join(", ")
    : [
        "0 1px 2px rgba(20, 20, 20, 0.12)",
        "-4px 5px 7px rgba(20, 20, 20, 0.10)",
        "-10px 13px 22px rgba(20, 20, 20, 0.13)",
      ].join(", ");
  /** Grounding shadow for the bottom-most sheet of piles and thick books */
  const baseShadow =
    "0 1px 2px rgba(20, 20, 20, 0.10), -12px 15px 24px rgba(20, 20, 20, 0.16)";
  const rotationDeg =
    book.rotation === "ccw" ? -90 : book.rotation === "cw" ? 90 : 0;
  // Deterministic layout variation: center the type on some pieces,
  // start it at the top (below the caption) on others.
  const centered = book.jitterX >= 0;

  const titleBlock = (
    <div
      className={
        book.bleed ? "relative -ml-[9%] w-[118%]" : "relative w-full"
      }
    >
      {book.titleLines.map((line, index) => (
        <FitLine key={`${line}-${index}`} text={line} fill={palette.fg} />
      ))}
    </div>
  );

  return (
    <Link
      href={`/book/${book.id}`}
      className="relative block transition-transform duration-200 hover:-translate-y-2"
      style={{
        width: book.width,
        height: book.height,
        transform: `translate(${book.jitterX}px, ${book.jitterY}px)`,
      }}
    >
      {/* Physical depth layers, offset toward the shadow side (down-left) */}
      {book.kind === "stack" && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: palette.bg,
              transform: "translate(-10px, 12px)",
              filter: "brightness(0.9)",
              boxShadow: baseShadow,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: palette.bg,
              transform: "translate(-5px, 6px)",
              filter: "brightness(0.95)",
            }}
          />
        </>
      )}
      {book.kind === "thickBook" && (
        <>
          <div
            className="absolute inset-0 bg-white"
            style={{
              transform: "translate(-9px, 10px)",
              boxShadow: baseShadow,
            }}
          />
          <div
            className="absolute inset-0 border border-black/10 bg-white"
            style={{ transform: "translate(-4px, 5px)" }}
          />
        </>
      )}
      {book.kind === "booklet" && (
        <div
          className="absolute inset-0"
          style={{
            background: palette.bg,
            filter: "brightness(0.93)",
            transform: "translate(-4px, 5px)",
            boxShadow: baseShadow,
          }}
        />
      )}

      {/* Top sheet / front cover */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ background: palette.bg, boxShadow: shadow }}
      >
        {book.kind === "blank" || isSmallCard ? (
          <div
            className={`absolute inset-x-0 flex justify-center ${
              isSmallCard ? "top-1/2 -translate-y-1/2" : "top-[36%]"
            }`}
          >
            <Wordmark
              color={palette.fg}
              size={isSmallCard ? "17px" : "26px"}
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
