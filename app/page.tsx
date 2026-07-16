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
      <h1
        aria-label="Aru"
        className="pointer-events-none fixed left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 select-none text-[clamp(96px,17vw,280px)] leading-none text-ink"
        style={{ fontFamily: "var(--font-devanagari)" }}
      >
        आरू
      </h1>
    </>
  );
}
