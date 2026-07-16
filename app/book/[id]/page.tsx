import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBook } from "@/lib/books";
import { FitLine } from "@/components/FitLine";

interface BookPageProps {
  params: Promise<{ id: string }>;
}

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
 * BookPage - The book from the table, opened flat as a two-page spread.
 *
 * Left page reproduces the cover typography in the book's palette; right
 * page is white paper with author, year, and blurb set like a program
 * booklet. A thin spine rule divides the pages. The spread lies on the same
 * gray tabletop with a slight perspective tilt.
 */
export default async function BookPage({
  params,
}: BookPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const book = getBook(parseId(id));
  const { palette } = book;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <Link
        href="/"
        className="font-display fixed left-6 top-6 z-10 text-[13px] tracking-wide text-ink hover:underline"
      >
        &larr; BACK TO THE TABLE
      </Link>

      <div style={{ perspective: "1600px" }}>
        <div
          className="flex"
          style={{
            transform: "rotateX(16deg)",
            boxShadow: "-30px 44px 60px rgba(20, 20, 20, 0.28)",
          }}
        >
          {/* Left page: the cover typography, opened flat */}
          <div
            className="relative flex w-[min(42vw,420px)] flex-col justify-center px-[4%] py-[6%]"
            style={{ background: palette.bg, aspectRatio: "5 / 7" }}
          >
            <div>
              {book.titleLines.map((line, index) => (
                <FitLine
                  key={`${line}-${index}`}
                  text={line}
                  fill={palette.fg}
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

          {/* Spine */}
          <div className="w-[3px] shrink-0 bg-black/25" />

          {/* Right page: white paper with the program-booklet text */}
          <div
            className="relative flex w-[min(42vw,420px)] flex-col bg-white px-[5%] py-[7%]"
            style={{ aspectRatio: "5 / 7" }}
          >
            <p className="font-display text-[15px] leading-tight">
              {book.author}
            </p>
            <p className="mt-1 text-[12px] tracking-widest">{book.year}</p>
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
    </main>
  );
}
