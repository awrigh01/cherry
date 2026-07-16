import { InfiniteTable } from "@/components/InfiniteTable";

/**
 * Home - The infinite book table, with the page title "आरू" (Aru) floating
 * dead-center over it. The masthead is white type under
 * `mix-blend-mode: difference`, so it optically inverts whatever the table
 * drifts underneath it — near-ink over the bare linen, live color shifts as
 * covers pass below. pointer-events-none keeps the books fully clickable.
 */
export default function Home(): React.ReactElement {
  return (
    <>
      <InfiniteTable />
      <div className="pointer-events-none fixed left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 select-none flex-col items-center [mix-blend-mode:difference]">
        <h1
          aria-label="Aru"
          className="text-[clamp(96px,17vw,280px)] leading-none text-white"
          style={{ fontFamily: "var(--font-devanagari)" }}
        >
          आरू
        </h1>
        {/* Negative margin tucks the wordmark right under the आरू glyphs:
            the title's line box reserves descender room below them. */}
        <p className="font-display mt-[clamp(-95px,-5.5vw,-26px)] text-[clamp(13px,1.3vw,20px)] leading-none tracking-wide text-white">
          CHERRY
          <span className="mx-[0.3em] inline-block h-[0.52em] w-[0.52em] bg-white" />
          NYC
        </p>
      </div>
    </>
  );
}
