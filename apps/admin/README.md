# Panel admina RecordShop

Panel sklepu z płytami RasBass: dodawanie płyt ze zdjęcia labelu, katalog, szkice i zamówienia do wysłania.
Mobile first: obsługuje się go głównie z telefonu.

**Stos:** Next.js 16 (App Router), React 19, TypeScript, Mantine 9, TanStack Query 5.

## Uruchomienie

Wymagania: Node.js 20+, pnpm, działające API (`apps/api`, domyślnie na `:3000`).

```bash
pnpm install            # w katalogu głównym repo
pnpm dev:api            # API
pnpm dev:admin          # panel na http://localhost:3001
```

Adres API dla serwera panelu ustawia `API_URL` (wzór w `.env.example`, domyślnie `http://localhost:3000`).
Logowanie kontem z uprawnieniami `products:*`; w danych startowych to `bob@example.com`.

### Test na telefonie

Telefon w tej samej sieci Wi-Fi otwiera panel pod adresem komputera, np. `http://192.168.18.104:3001`.

- Next w trybie dev blokuje skrypty `/_next` dla obcych hostów; `allowedDevOrigins` w `next.config.ts` wpuszcza
  adresy `192.168.*.*`. Bez tego strona się wyświetla, ale bez JavaScriptu (nie działa logowanie ani przyciski).
  Inna podsieć (np. `10.0.*.*`) wymaga dopisania jej tam.
- Chrome na iOS dopisuje polom formularza atrybut `__gchrome_uniqueid` przed hydracją, więc formularz logowania ma
  `suppressHydrationWarning`. Ten sam błąd hydracji w innym formularzu leczy się tak samo.

## Skrypty

| Polecenie           | Co robi                      |
| ------------------- | ---------------------------- |
| `pnpm dev`          | serwer deweloperski          |
| `pnpm build`        | build produkcyjny            |
| `pnpm start`        | uruchomienie buildu          |
| `pnpm lint`         | ESLint                       |
| `pnpm format`       | Prettier (zapis)             |
| `pnpm format:check` | Prettier (tylko sprawdzenie) |

## Struktura

```
src/
  app/            strony (App Router) i trasy serwera panelu:
    api/auth/       logowanie i wylogowanie (token w ciasteczku httpOnly)
    api/proxy/      pośrednik do API, dokleja token
  services/       jedyne miejsce, które rozmawia z API: czyste, typowane funkcje (*.services.ts)
  hooks/          hooki TanStack Query na serwisach; klucze zapytań w queryKeys.ts
  types/          typy domeny (produkt, wyszukiwanie wydań, zamówienie, sesja)
  components/
    layout/         szkielet: nagłówek, menu boczne i dolne
    records/        listy płyt (wiersz, miniatura, cena, plakietki szkicu)
    dashboard/      pulpit: kafelki, kolejka wysyłek, „Wymaga uwagi”, wykres sprzedaży, stan magazynu
    orders/         wiersz zamówienia i widok zamówienia
    wizard/         kreator „Dodaj płytę” (kroki + logika w details.ts, condition.ts, recordInput.ts)
    ui/             stany ładowania, błędu i pusty, tytuł strony
  lib/            motyw (tokeny), formatowanie, słupki wykresu sprzedaży (sales.ts), zmniejszanie zdjęć
```

## Konwencje

- Komponenty nie wołają `fetch` i nie sklejają adresów: tylko hooki z `hooks/`, a te tylko serwisy z `services/`.
- Jeden komponent na plik, eksport domyślny, nazwany `type XProps` nad komponentem.
- Semantyczny HTML: sekcje z `aria-labelledby`, listy jako `ul/li`, pary etykieta–wartość jako `dl/dt/dd`, grupy
  wyboru jako `fieldset/legend`; stany ładowania z `role="status"`, błędy z `role="alert"`.
- Rozmiary tekstu i nagłówków z motywu (`fz="xxl"`, `order={2}`), nie liczby w propsach.

## Szerokości ekranu

- **< 768 px (telefon):** nagłówek, treść w jednej kolumnie, dolne menu z aparatem na środku.
- **≥ 768 px:** menu boczne zamiast dolnego, treść wyśrodkowana w kolumnie do 640 px.
