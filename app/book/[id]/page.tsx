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
/** Small self shadow for the flipping cover; the big ambient one is cast by
 * the non-rotating ground-shadow element instead. */
const COVER_SHADOW = "0 2px 8px rgba(20, 20, 20, 0.2)";

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
}

/**
 * CoverFace - The flipping front cover's single face: the book's palette,
 * justified stacked-type title, and tiny corner captions. While the cover's
 * back is toward the camera, the `face-unmirror` animation pre-mirrors the
 * content so it reads as the front cover (see globals.css). The title stack
 * is rendered twice with different size budgets, because the mobile page is
 * squarer (9/10) than the desktop 5/7 and long titles would overflow it.
 */
function CoverFace({ book }: CoverFaceProps): React.ReactElement {
  const { palette } = book;
  const lines = book.titleLines.length;
  const desktopMax = titleMaxSize(7 / 5 / 1.09, lines, book.lang);
  const mobileMax = titleMaxSize(10 / 9 / 1.09, lines, book.lang);
  return (
    <div
      className="book-face absolute inset-0 flex flex-col justify-center overflow-hidden px-[6%]"
      style={{ background: palette.bg, boxShadow: COVER_SHADOW }}
    >
      <div className="sm:hidden">
        {book.titleLines.map((line, index) => (
          <FitLine
            key={`${line}-${index}`}
            text={line}
            fill={palette.fg}
            maxSize={mobileMax}
            lang={book.lang}
          />
        ))}
      </div>
      <div className="hidden sm:block">
        {book.titleLines.map((line, index) => (
          <FitLine
            key={`${line}-${index}`}
            text={line}
            fill={palette.fg}
            maxSize={desktopMax}
            lang={book.lang}
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
    <main className="flex min-h-screen flex-col items-center justify-center overflow-hidden px-3 py-10 sm:px-6 sm:py-16">
      <Link
        href="/"
        className="font-display fixed left-4 top-4 z-10 text-[13px] tracking-wide text-ink hover:underline sm:left-6 sm:top-6"
      >
        &larr; BACK
        <span className="hidden sm:inline"> TO THE TABLE</span>
      </Link>

      {/* No scene-wide preserve-3d: WebKit sorts 3D siblings unreliably
          (shadows and pages paint above the cover). The tilt carries its own
          perspective(), the flip gets a local perspective on its slot, and
          paint order is plain 2D stacking. */}
      <div>
        <div className="book-settle">
          {/* Glides right in sync with the cover swinging left, so the
              closed book and the finished spread are both centered */}
          <div className="book-shift">
            <div
              className="relative flex flex-col sm:flex-row"
              style={{ transform: "perspective(1600px) rotateX(16deg)" }}
            >
              {/* Cover slot: non-rotating ground shadow + flipping cover.
                  z-10 keeps the swinging cover above the text page. Mobile
                  pages run near full width, each about half the viewport. */}
              <div
                className="relative z-10 aspect-[9/10] w-[min(92vw,360px)] sm:aspect-[5/7] sm:w-[min(42vw,420px)]"
                style={{ perspective: "1600px" }}
              >
                {/* Shadow + page-block edges the cover lands on. The two
                    shadow layers cross-fade (airborne soft -> landed hard)
                    so no box-shadow value ever animates. */}
                <div className="book-ground-shadow absolute inset-0">
                  <div className="book-shadow-soft" />
                  <div className="book-shadow-hard" />
                  <div className="absolute -bottom-[5px] left-[6px] right-0 hidden h-[5px] bg-[#eceae4] sm:block" />
                  <div className="absolute -bottom-[10px] left-[13px] right-0 hidden h-[5px] bg-[#e2dfd7] sm:block" />
                </div>
                <div className="book-flipper absolute inset-0">
                  <CoverFace book={book} />
                </div>
              </div>

              {/* Spine */}
              <div className="h-[3px] w-full shrink-0 bg-black/25 sm:h-auto sm:w-[3px]" />

              {/* Text page: white paper with the program-booklet copy */}
              <div
                className="relative flex aspect-[9/10] w-[min(92vw,360px)] flex-col bg-white px-[5%] py-[6%] sm:aspect-[5/7] sm:w-[min(42vw,420px)] sm:py-[7%]"
                style={{ boxShadow: PAGE_SHADOW }}
              >
                {/* Gutter shadow where the page dives into the spine */}
                <div className="absolute inset-x-0 top-0 h-[6px] bg-black/10 sm:inset-x-auto sm:inset-y-0 sm:left-0 sm:h-auto sm:w-[6px]" />
                {/* Page-block edges under the text page */}
                <div className="absolute -bottom-[5px] left-0 right-[4px] h-[5px] bg-[#eceae4]" />
                <div className="absolute -bottom-[10px] left-0 right-[9px] h-[5px] bg-[#e2dfd7]" />
                <div className="book-fade flex min-h-0 grow flex-col">
                  <p className="font-display text-[15px] leading-tight">
                    {book.author}
                  </p>
                  <p className="mt-1 text-[12px] tracking-widest">
                    {book.year}
                  </p>
                  <hr className="my-4 border-t border-black/20 sm:my-5" />
                  <p className="text-[14px] leading-snug sm:leading-relaxed">
                    {book.blurb}
                  </p>
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
