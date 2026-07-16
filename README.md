# Cherry

An infinite table of books. The home page is a perspective-tilted tabletop
covered in bold typographic printed pieces (inspired by the PAC NYC brand
identity) that scrolls forever. Every book is generated deterministically
from its numeric id — same id, same book — so there is no database and no
external API. Clicking a piece opens the book flat as a two-page spread.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Archivo Black / Archivo via `next/font`

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

- `lib/books.ts` — seeded (mulberry32) generator: titles, authors, years,
  blurbs, color pairings, piece kinds (flyer / folded booklet / stack /
  thick book / blank wordmark), type rotation, and edge-bleed flags.
- `components/FitLine.tsx` — SVG `textLength` line that justifies each title
  word edge-to-edge, the defining typographic detail.
- `components/InfiniteTable.tsx` — fixed 3D scene (`rotateX(52deg)
  rotateZ(-32deg)`); document scroll pans the plane along its own axis and an
  IntersectionObserver sentinel appends the next batch of books.
- `app/book/[id]/page.tsx` — the open-book spread, re-derived from the URL id.
