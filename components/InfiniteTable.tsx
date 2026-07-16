"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getBooks } from "@/lib/books";
import { BookCard } from "@/components/BookCard";

const COLS = 10;
const CELL_W = 350;
const CELL_H = 380;
const PLANE_W = COLS * CELL_W;
/** Local-plane distance the grid extends above the pivot at scroll 0 */
const PLANE_TOP = -2300;
const INITIAL_COUNT = 120;
const BATCH = 60;

/**
 * InfiniteTable - The perspective-tilted tabletop of books.
 *
 * A fixed full-viewport scene holds a large plane rotated with
 * `rotateX(52deg) rotateZ(-32deg)` (grid rows recede diagonally toward the
 * upper right, as in the reference photo). Document scroll translates the
 * plane along its own local Y axis so the camera pans across the table.
 * An IntersectionObserver sentinel at the bottom of an invisible spacer
 * appends the next deterministic batch of books; new pieces simply appear.
 *
 * @example
 * ```tsx
 * <InfiniteTable />
 * ```
 */
export function InfiniteTable(): React.ReactElement {
  const [count, setCount] = useState(INITIAL_COUNT);
  const [scale, setScale] = useState(1);
  const pivotRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useRef(1);

  useEffect(() => {
    // Uniform 3D scale shrinks the whole table (thickness included) on small
    // screens; scroll translation is divided back out so one scrolled pixel
    // still pans roughly one screen pixel.
    const apply = (): void => {
      if (pivotRef.current) {
        const s = scaleRef.current;
        pivotRef.current.style.transform = `scale3d(${s}, ${s}, ${s}) rotateX(52deg) rotateZ(-32deg) translate3d(0, ${-window.scrollY / s}px, 0)`;
      }
    };
    const onResize = (): void => {
      scaleRef.current = window.innerWidth < 640 ? 0.62 : 1;
      setScale(scaleRef.current);
      apply();
    };
    onResize();
    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setCount((current) => current + BATCH);
        }
      },
      { rootMargin: "3500px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // Reconnect after each batch so the observer refires if the sentinel is
    // still within the root margin after the spacer grows.
  }, [count]);

  const books = useMemo(() => getBooks(0, count), [count]);
  const rows = Math.ceil(count / COLS);

  return (
    <main>
      <div
        className="fixed inset-0 overflow-hidden"
        style={{ perspective: "1700px" }}
      >
        <div
          ref={pivotRef}
          className="absolute left-1/2 top-1/2 h-0 w-0 [transform-style:preserve-3d]"
          style={{ transform: "rotateX(52deg) rotateZ(-32deg)" }}
        >
          <div
            className="absolute grid [transform-style:preserve-3d]"
            style={{
              width: PLANE_W,
              left: -PLANE_W / 2,
              top: PLANE_TOP,
              gridTemplateColumns: `repeat(${COLS}, ${CELL_W}px)`,
              gridAutoRows: `${CELL_H}px`,
            }}
          >
            {books.map((book) => (
              <div
                key={book.id}
                className="flex items-center justify-center [transform-style:preserve-3d]"
              >
                <BookCard book={book} />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Invisible scroll track; grows with each appended batch.
          pointer-events-none so it never intercepts clicks meant for the
          fixed scene beneath it in the stacking order. */}
      <div
        aria-hidden
        className="pointer-events-none relative"
        style={{ height: rows * CELL_H * scale }}
      >
        <div ref={sentinelRef} className="absolute bottom-0 h-px w-px" />
      </div>
    </main>
  );
}
