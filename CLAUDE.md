# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

Monorepo (pnpm workspaces) for a small online record shop. The guiding principle is to keep the architecture simple for
a small shop but open to growth, without overengineering. Docs and UI copy are in Polish.

- `apps/api`: the REST API (`@record-shop/api`). Its own `CLAUDE.md` covers architecture, conventions and tests.
- `apps/admin`: the admin panel SPA, not started yet. `apps/admin/NOTES.md` lists what the panel needs from the API.
- `docs/audit`: past audit reports of the API (historical; line numbers refer to old paths).

## Commands

```bash
pnpm install                # install all workspaces (run at repo root)
docker compose up -d        # Postgres, Redis, Mailpit shared by all apps (run at repo root)
pnpm api <script>           # run an API script from the root, e.g. `pnpm api test`
pnpm dev:api                # shortcut for the API dev server
```

App scripts read `.env` / `.env.test` and resolve `./uploads` relative to the app directory, so run them inside the
app's folder or through `pnpm --filter`, never with a root-level `npx`.
