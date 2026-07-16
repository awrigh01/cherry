import { InfiniteTable } from "@/components/InfiniteTable";

/**
 * Home - The infinite book table, with the page title "आरू" (Aru) floating
 * dead-center over it like a poster masthead. pointer-events-none keeps the
 * books underneath fully clickable.
 */
export default function Home(): React.ReactElement {
  return (
    <>
      <InfiniteTable />
      <div className="pointer-events-none fixed left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 select-none">
        <div className="stamp flex flex-col items-center px-[clamp(24px,3vw,52px)] pb-[clamp(14px,1.6vw,28px)] pt-[clamp(10px,1.2vw,20px)]">
          <h1
            aria-label="Aru"
            className="text-[clamp(96px,17vw,280px)] leading-none text-ink"
            style={{ fontFamily: "var(--font-devanagari)" }}
          >
            आरू
          </h1>
          {/* Negative margin tucks the wordmark right under the आरू glyphs:
              the title's line box reserves descender room below them. */}
          <p className="font-display mt-[clamp(-95px,-5.5vw,-26px)] text-[clamp(13px,1.3vw,20px)] leading-none tracking-wide text-ink">
            CHERRY
            <span className="mx-[0.3em] inline-block h-[0.52em] w-[0.52em] bg-ink" />
            NYC
          </p>
        </div>
      </div>
    </>
  );
}
