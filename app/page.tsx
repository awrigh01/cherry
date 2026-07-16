import { InfiniteTable } from "@/components/InfiniteTable";

/**
 * Props for the StampFace component
 */
interface StampFaceProps {
  /** Ghost copies render the title as a div so the page keeps a single h1 */
  ghost?: boolean;
}

/**
 * StampFace - One impression of the आरू masthead stamp (border, title,
 * wordmark). Rendered twice for a double-exposed strike: the real face on
 * top, and a ghost face underneath that `.stamp-ghost` offsets, re-rotates,
 * fades, and re-wears with a shifted mask.
 */
function StampFace({ ghost = false }: StampFaceProps): React.ReactElement {
  const Title = ghost ? "div" : "h1";
  return (
    <div
      aria-hidden={ghost || undefined}
      className={`stamp ${ghost ? "stamp-ghost absolute inset-0" : "relative"} flex flex-col items-center px-[clamp(24px,3vw,52px)] pb-[clamp(14px,1.6vw,28px)] pt-[clamp(10px,1.2vw,20px)]`}
    >
      <Title
        aria-label={ghost ? undefined : "Aru"}
        className="text-[clamp(96px,17vw,280px)] leading-none text-ink"
        style={{ fontFamily: "var(--font-devanagari)" }}
      >
        आरू
      </Title>
      {/* Negative margin tucks the wordmark right under the आरू glyphs:
          the title's line box reserves descender room below them. */}
      <p className="font-display mt-[clamp(-95px,-5.5vw,-26px)] text-[clamp(13px,1.3vw,20px)] leading-none tracking-wide text-ink">
        CHERRY
        <span className="mx-[0.3em] inline-block h-[0.52em] w-[0.52em] bg-ink" />
        NYC
      </p>
    </div>
  );
}

/**
 * Home - The infinite book table, with the page title "आरू" (Aru) pressed
 * over it like a double-struck rubber stamp. pointer-events-none keeps the
 * books underneath fully clickable.
 */
export default function Home(): React.ReactElement {
  return (
    <>
      <InfiniteTable />
      <div className="pointer-events-none fixed left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 select-none">
        <div className="relative">
          <StampFace ghost />
          <StampFace />
        </div>
      </div>
    </>
  );
}
