# Sklep RasBass

Sklep jest aplikacją `@record-shop/shop` w monorepo pnpm. Polecenie `pnpm dev:shop` uruchamia go na porcie 3002. Do sprawdzenia zmian służą `pnpm shop lint` i `pnpm shop build`.

- Projektuj od telefonu. Moro stanowi tło, katalog ma prosty układ, a przycisk dodawania znajduje się przy płycie. Interfejs sklepu ma trzy języki: EN (domyślny), ES i PL. Zasady tłumaczenia danych produktowych opisuje [plan sklepu](../api/TODO.md#0-języki).
- Jednostką oferty jest wariant. Karta katalogowa, strona szczegółów i podgląd koszyka dotyczą jednego wariantu.
- Katalog pobiera opublikowane płyty z publicznego endpointu GET /products. Serwer sklepu używa API_URL (domyślnie http://localhost:3000). „Dodaj do koszyka” otwiera podgląd wybranej płyty, na telefonie wysuwany od dołu.
- Utrzymuj zgodność stosu z adminem: Next.js App Router, React, TypeScript, Mantine, Tabler Icons i TanStack Query. Przy podłączaniu API stosuj podział na serwisy, hooki i komponenty opisany w [konwencjach admina](../admin/README.md#konwencje).

Zasady całego repozytorium opisuje [CLAUDE.md](../../CLAUDE.md), a dotychczasowe ustalenia zbiera [stan projektu](../../docs/STATUS.md).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

This application uses Discogs’ API but is not affiliated with, sponsored or endorsed by Discogs. ‘Discogs’ is a trademark of Zink Media, LLC.
