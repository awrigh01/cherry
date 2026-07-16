"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { getBook, GRID_COLS, type Book } from "@/lib/books";
import { BookCard } from "@/components/BookCard";

// Cells must exceed the largest piece (272x362) plus +/-30px jitter so
// neighbors can never overlap. Column count comes from the generator, which
// arranges the kind/palette mix per row.
const COLS = GRID_COLS;
const CELL_W = 385;
const CELL_H = 465;
const PLANE_W = COLS * CELL_W;
/** Local-plane distance the grid extends above the pivot at scroll 0 */
const PLANE_TOP = -2300;
const INITIAL_COUNT = 120;
/** Table pan distance per scrolled pixel */
const SCROLL_SPEED = 1.35;
/** Smoothing stiffness (per second); higher = snappier catch-up */
const SMOOTHING = 9;
/** Idle drift speed (plane px/s) before the user's first scroll */
const DRIFT_SPEED = 14;
/** Rendered window around the pan offset, in plane px: FAR extends toward
 * the receding top-right edge (which perspective keeps visible for a long
 * way), NEAR past the bottom of the screen. */
const FAR_MARGIN = 3500;
const NEAR_MARGIN = 2500;

/** Mounted row window; rows outside it are unmounted entirely. */
interface RowRange {
  start: number;
  end: number;
}

/** Books are pure functions of their id, so a card only ever needs to
 * re-render if its id changed — the window sliding must not re-render the
 * cards that stay mounted. */
const MemoBookCard = memo(
  BookCard,
  (prev, next) => prev.book.id === next.book.id,
);

/**
 * InfiniteTable - The perspective-tilted tabletop of books.
 *
 * A fixed full-viewport scene holds a plane rotated with
 * `rotateX(52deg) rotateZ(-32deg)` (grid rows recede diagonally toward the
 * upper right, as in the reference photo). Until the user scrolls, the plane
 * drifts forward on its own at `DRIFT_SPEED`; the first scroll freezes the
 * drift (as a constant base offset) and document scroll takes over the pan:
 * a requestAnimationFrame loop eases the plane toward the scroll position
 * with an exponential damp (inertial, frame-rate independent), moving
 * `SCROLL_SPEED` table pixels per scrolled pixel.
 *
 * The table is windowed, not appended: only the dozen-ish rows around the
 * current pan offset are mounted (cards are positioned absolutely from
 * their id, so any window renders identically), which keeps the DOM and
 * the composited plane layer a constant size no matter how far you scroll.
 * The pan loop grows the invisible scroll track ahead of the offset so
 * there is always room to keep scrolling.
 *
 * @example
 * ```tsx
 * <InfiniteTable />
 * ```
 */
export function InfiniteTable(): React.ReactElement {
  const [count, setCount] = useState(INITIAL_COUNT);
  const [scale, setScale] = useState(1);
  const [range, setRange] = useState<RowRange>({
    start: 0,
    end: Math.ceil(INITIAL_COUNT / COLS) - 1,
  });
  const pivotRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useRef(1);
  const countRef = useRef(INITIAL_COUNT);
  const rangeRef = useRef(range);

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  useEffect(() => {
    // Uniform 3D scale shrinks the whole table (thickness included) on small
    // screens; scroll translation is divided back out so one scrolled pixel
    // still pans consistently regardless of scale.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let idle = true;
    let current = 0;
    let last = 0;
    // The idle drift accumulates here; once the user scrolls it freezes and
    // remains as a constant base offset under the scroll-driven pan.
    let drift = 0;
    let drifting = !reduced.matches;

    const targetOffset = (): number =>
      (window.scrollY * SCROLL_SPEED) / scaleRef.current + drift;

    const apply = (offset: number): void => {
      if (pivotRef.current) {
        const s = scaleRef.current;
        pivotRef.current.style.transform = `scale3d(${s}, ${s}, ${s}) rotateX(52deg) rotateZ(-32deg) translate3d(0, ${-offset}px, 0)`;
      }
    };

    // Slide the mounted row window with the pan and keep the scroll track
    // (count) growing ahead of it, so neither the drift nor a long fling
    // ever outruns the rendered table. State only updates when the window
    // actually crosses a row boundary.
    const syncWindow = (offset: number): void => {
      const s = scaleRef.current;
      const start = Math.max(
        0,
        Math.floor((offset - FAR_MARGIN / s - PLANE_TOP) / CELL_H),
      );
      const end = Math.ceil((offset + NEAR_MARGIN / s - PLANE_TOP) / CELL_H);
      if (start !== rangeRef.current.start || end !== rangeRef.current.end) {
        rangeRef.current = { start, end };
        setRange(rangeRef.current);
      }
      const needed = (end + 2) * COLS;
      if (needed > countRef.current) {
        setCount((value) => Math.max(value, needed));
      }
    };

    const tick = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (drifting) drift += DRIFT_SPEED * dt;
      const target = targetOffset();
      current = reduced.matches
        ? target
        : current + (target - current) * (1 - Math.exp(-SMOOTHING * dt));
      if (Math.abs(target - current) < 0.3 && !drifting) {
        current = target;
      }
      apply(current);
      syncWindow(current);
      if (current === target && !drifting) {
        idle = true;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const wake = (): void => {
      if (idle) {
        idle = false;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    // The first real scroll hands control to the scrollbar for good.
    const onScroll = (): void => {
      drifting = false;
      wake();
    };

    const onResize = (): void => {
      scaleRef.current = window.innerWidth < 640 ? 0.62 : 1;
      setScale(scaleRef.current);
      wake();
    };
    onResize();
    current = targetOffset();
    apply(current);
    syncWindow(current);
    wake();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Only the windowed rows exist in the DOM; each card is placed absolutely
  // at its deterministic cell so any window renders the same table.
  const books = useMemo<Book[]>(() => {
    const list: Book[] = [];
    for (
      let id = range.start * COLS;
      id < Math.min(count, (range.end + 1) * COLS);
      id++
    ) {
      list.push(getBook(id));
    }
    return list;
  }, [range, count]);
  const rows = Math.ceil(count / COLS);

  return (
    <main>
      <div
        className="fixed inset-0 overflow-hidden"
        style={{ perspective: "1700px" }}
      >
        <div
          ref={pivotRef}
          className="absolute left-1/2 top-1/2 h-0 w-0 will-change-transform [transform-style:preserve-3d]"
          style={{ transform: "rotateX(52deg) rotateZ(-32deg)" }}
        >
          {books.map((book) => (
            <div
              key={book.id}
              className="absolute flex items-center justify-center [transform-style:preserve-3d]"
              style={{
                width: CELL_W,
                height: CELL_H,
                left: -PLANE_W / 2 + (book.id % COLS) * CELL_W,
                top: PLANE_TOP + Math.floor(book.id / COLS) * CELL_H,
              }}
            >
              <MemoBookCard book={book} />
            </div>
          ))}
        </div>
      </div>
      {/* Invisible scroll track; grows as the pan loop raises `count` so
          there is always room to keep scrolling. Divided by SCROLL_SPEED
          since each scrolled pixel pans further. pointer-events-none so it
          never intercepts clicks meant for the fixed scene beneath it. */}
      <div
        aria-hidden
        className="pointer-events-none relative"
        style={{ height: (rows * CELL_H * scale) / SCROLL_SPEED }}
      />
    </main>
  );
}
