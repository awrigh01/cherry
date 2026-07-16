"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getBooks, GRID_COLS } from "@/lib/books";
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
const BATCH = 60;
/** Table pan distance per scrolled pixel */
const SCROLL_SPEED = 1.35;
/** Smoothing stiffness (per second); higher = snappier catch-up */
const SMOOTHING = 9;
/** Idle drift speed (plane px/s) before the user's first scroll */
const DRIFT_SPEED = 14;

/**
 * InfiniteTable - The perspective-tilted tabletop of books.
 *
 * A fixed full-viewport scene holds a large plane rotated with
 * `rotateX(52deg) rotateZ(-32deg)` (grid rows recede diagonally toward the
 * upper right, as in the reference photo). Until the user scrolls, the plane
 * drifts forward on its own at `DRIFT_SPEED`; the first scroll freezes the
 * drift (as a constant base offset) and document scroll takes over the pan:
 * a requestAnimationFrame loop eases the plane toward the scroll position
 * with an exponential damp (inertial, frame-rate independent), moving
 * `SCROLL_SPEED` table pixels per scrolled pixel. An IntersectionObserver
 * sentinel at the bottom of an invisible spacer appends the next
 * deterministic batch of books, and the pan loop tops up the count directly
 * so the drift never outruns the loaded rows.
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
  const countRef = useRef(INITIAL_COUNT);

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

    // Keep enough rows mounted for the current pan plus a screen of margin;
    // the drift advances without moving scrollY, so the scroll sentinel
    // alone can't be trusted to load ahead of it.
    const ensureLoaded = (offset: number): void => {
      const needed =
        (Math.ceil((offset - PLANE_TOP) / CELL_H) + 8) * COLS;
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
        apply(current);
        idle = true;
        return;
      }
      apply(current);
      ensureLoaded(current);
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
    wake();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
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
          className="absolute left-1/2 top-1/2 h-0 w-0 will-change-transform [transform-style:preserve-3d]"
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
      {/* Invisible scroll track; grows with each appended batch. Divided by
          SCROLL_SPEED since each scrolled pixel pans further now.
          pointer-events-none so it never intercepts clicks meant for the
          fixed scene beneath it in the stacking order. */}
      <div
        aria-hidden
        className="pointer-events-none relative"
        style={{ height: (rows * CELL_H * scale) / SCROLL_SPEED }}
      >
        <div ref={sentinelRef} className="absolute bottom-0 h-px w-px" />
      </div>
    </main>
  );
}
