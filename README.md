# RecordShop

Sklep internetowy z płytami winylowymi (reggae, nowe i używane), koszulkami i gadżetami. Monorepo na pnpm workspaces.

| Katalog       | Co to                                                                              |
|---------------|------------------------------------------------------------------------------------|
| `apps/api`    | REST API: Node.js + TypeScript, Express 5, PostgreSQL, Redis. [README](apps/api/README.md) |
| `apps/admin`  | Panel admina (prototyp): Next.js, Mantine. [Notatki](apps/admin/NOTES.md)                 |
| `apps/shop`   | Sklep dla klientów (prototyp): Next.js, Mantine. [Wskazówki](apps/shop/AGENTS.md) |
| `docs/audit`  | Raporty z audytów API                                                              |

Sklep uruchom z katalogu głównego poleceniem `pnpm dev:shop`. Podgląd pod `http://localhost:3002` korzysta z przykładowych płyt.

## Szybki start

Wymagania: Node.js, pnpm, Docker.

```bash
pnpm install
```

```bash
docker compose up -d
```

`docker compose` w katalogu głównym uruchamia PostgreSQL (`:5432`), Redis (`:6379`) i Mailpit (SMTP `:1025`, podgląd
`http://localhost:8025`), wspólne dla wszystkich aplikacji.

Polecenia aplikacji uruchamia się w jej katalogu (`cd apps/api && pnpm dev`) albo z katalogu głównego przez filtr:

```bash
pnpm api migrate
```

```bash
pnpm dev:api
```

```bash
pnpm dev:admin
```

Panel działa na `http://localhost:3001` i rozmawia z API przez własny serwer (adres API w `API_URL`, domyślnie
`http://localhost:3000`).
