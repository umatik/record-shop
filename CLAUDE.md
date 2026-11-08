# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

Monorepo (pnpm workspaces) for a small online record shop. The guiding principle is to keep the architecture simple for
a small shop but open to growth, without overengineering. Docs and UI copy are in Polish.

- `apps/api`: the REST API (`@record-shop/api`). Its own `CLAUDE.md` covers architecture, conventions and tests.
- `apps/admin`: the admin panel (`@record-shop/admin`), a prototype: Next.js 16 (App Router), Mantine 9, TanStack
  Query. Mobile first is a hard rule for every screen. The browser talks only to the panel: `/api/auth/*` logs in and
  keeps the API JWT in an httpOnly cookie, `/api/proxy/*` forwards requests to the API (`API_URL`) with that token,
  and `src/proxy.ts` redirects to `/login` without a session. `apps/admin/NOTES.md` lists what the panel needs from
  the API (written before the switch from Vite to Next).
- `docs/audit`: past audit reports of the API (historical; line numbers refer to old paths).

## Commands

```bash
pnpm install                # install all workspaces (run at repo root)
docker compose up -d        # Postgres, Redis, Mailpit shared by all apps (run at repo root)
pnpm api <script>           # run an API script from the root, e.g. `pnpm api test`
pnpm dev:api                # shortcut for the API dev server (:3000)
pnpm dev:admin              # admin panel dev server (:3001), needs the API running
```

App scripts read `.env` / `.env.test` and resolve `./uploads` relative to the app directory, so run them inside the
app's folder or through `pnpm --filter`, never with a root-level `npx`.
