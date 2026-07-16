import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBook, type Book } from "@/lib/books";
import { FitLine, titleMaxSize } from "@/components/FitLine";

interface BookPageProps {
  params: Promise<{ id: string }>;
}

const PAGE_SHADOW =
  "0 1px 2px rgba(20, 20, 20, 0.12), -18px 26px 44px rgba(20, 20, 20, 0.22)";

/** Parse and validate the numeric book id from the URL, or 404. */
const parseId = (raw: string): number => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 0) notFound();
  return id;
};

/**
 * Per-book page title, e.g. "OUR STAGE IS YOUR STAGE — Cherry".
 */
export async function generateMetadata({
  params,
}: BookPageProps): Promise<Metadata> {
  const { id } = await params;
  const book = getBook(parseId(id));
  return { title: `${book.title} — Cherry` };
}

/**
 * Props for the CoverFace component
 */
interface CoverFaceProps {
  /** The book whose cover typography to render */
  book: Book;
  /** Extra class for this face (the cover back-face flips per breakpoint) */
  className?: string;
}

/**
 * CoverFace - One face of the flipping front cover: the book's palette,
 * justified stacked-type title, and tiny corner captions.
 */
function CoverFace({ book, className }: CoverFaceProps): React.ReactElement {
  const { palette } = book;
  const maxSize = titleMaxSize(7 / 5 / 1.09, book.titleLines.length);
  return (
    <div
      className={`absolute inset-0 flex flex-col justify-center overflow-hidden px-[6%] [backface-visibility:hidden] ${className ?? ""}`}
      style={{ background: palette.bg, boxShadow: PAGE_SHADOW }}
    >
      <div>
        {book.titleLines.map((line, index) => (
          <FitLine
            key={`${line}-${index}`}
            text={line}
            fill={palette.fg}
            maxSize={maxSize}
          />
        ))}
      </div>
      <span
        className="font-display absolute left-[6%] top-[4%] text-[11px] leading-none"
        style={{ color: palette.fg }}
      >
        CHERRY
      </span>
      <span
        className="font-display absolute bottom-[4%] right-[6%] text-[11px] leading-none"
        style={{ color: palette.fg }}
      >
        NYC
      </span>
    </div>
  );
}

/**
 * BookPage - The book from the table, opening itself into a two-page spread.
 *
 * The book arrives closed (front cover lying on the right page), settles onto
 * the table, then the cover swings 180 degrees open around the spine in 3D
 * with a slight bounce, revealing the inside-left page. The right page's
 * program-booklet text fades in once the cover lands. Pure CSS keyframes;
 * honors prefers-reduced-motion.
 */
export default async function BookPage({
  params,
}: BookPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const book = getBook(parseId(id));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <Link
        href="/"
        className="font-display fixed left-6 top-6 z-10 text-[13px] tracking-wide text-ink hover:underline"
      >
        &larr; BACK TO THE TABLE
      </Link>

      <div style={{ perspective: "1600px" }}>
        <div className="book-settle [transform-style:preserve-3d]">
          {/* Glides right in sync with the cover swinging left, so the
              closed book and the finished spread are both centered */}
          <div className="book-shift [transform-style:preserve-3d]">
            <div
              className="relative flex flex-col sm:flex-row [transform-style:preserve-3d]"
              style={{ transform: "rotateX(16deg)" }}
            >
              {/* Page-block edges peeking out under the open book */}
              <div className="absolute -bottom-[5px] left-[6px] right-[4px] h-[5px] bg-[#eceae4]" />
              <div className="absolute -bottom-[10px] left-[13px] right-[9px] h-[5px] bg-[#e2dfd7]" />

              {/* Front cover / inside page, hinged at the spine */}
              <div
                className="book-flipper relative w-[min(66vw,300px)] sm:w-[min(42vw,420px)] [transform-style:preserve-3d]"
                style={{ aspectRatio: "5 / 7" }}
              >
                {/* Inside face: visible once the book is open */}
                <CoverFace book={book} />
                {/* Front-cover face: visible while the book is still closed */}
                <CoverFace book={book} className="book-face-cover" />
              </div>

              {/* Spine */}
              <div className="h-[3px] w-full shrink-0 bg-black/25 sm:h-auto sm:w-[3px]" />

              {/* Text page: white paper with the program-booklet copy */}
              <div
                className="relative flex w-[min(66vw,300px)] flex-col bg-white px-[5%] py-[7%] sm:w-[min(42vw,420px)]"
                style={{ aspectRatio: "5 / 7", boxShadow: PAGE_SHADOW }}
              >
                <div className="book-fade flex min-h-0 grow flex-col">
                  <p className="font-display text-[15px] leading-tight">
                    {book.author}
                  </p>
                  <p className="mt-1 text-[12px] tracking-widest">
                    {book.year}
                  </p>
                  <hr className="my-5 border-t border-black/20" />
                  <p className="text-[14px] leading-relaxed">{book.blurb}</p>
                  <div className="mt-auto flex items-end justify-between">
                    <span className="font-display text-[11px] leading-none">
                      CHERRY
                      <span className="mx-[0.22em] inline-block h-[0.52em] w-[0.52em] bg-ink" />
                      NYC
                    </span>
                    <span className="text-[10px] tracking-widest">
                      NO. {String(book.id).padStart(4, "0")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
