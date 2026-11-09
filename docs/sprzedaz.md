# Etap sprzedaży: zamówienia, płatności, wysyłka

Plan z 2026-11-08. Pulpit panelu pokazuje to, co wymaga reakcji właściciela, a przede wszystkim opłacone
zamówienia do wysłania. Ten plik zbiera decyzje i kolejność prac. Szczegóły kodu są w `apps/api` i `apps/admin`.

## Decyzje

- **Pulpit** (od 2026-11-09 według `docs/pulpit-claude.md`, wcześniej sama lista „Do wysłania”). Od góry:
  cztery kafelki (do wysłania, opłacone produkty, sprzedane sztuki, szkice), kolejka **„Do wysłania”**,
  „Wymaga uwagi”, wykres sprzedaży i pasek stanu magazynu.
  - „Do wysłania” zostaje najważniejszą sekcją: opłacone zamówienia od najdłużej czekających **od zapłaty**
    (`sort=paid_oldest`), z płytą, kupującym, kwotą i liczbą dni oczekiwania. Widać 2, resztę odsłania
    „Pokaż wszystkie”. Pusty stan: „Nic do wysłania”.
  - „Wymaga uwagi” pokazuje się tylko, gdy coś w niej jest: zamówienia czekające na płatność (rozwijana lista)
    i szkice gotowe do publikacji (link do `/szkice?gotowe=1`). „Wiadomości bez odpowiedzi” dojdą z wiadomościami.
  - Okres (30 albo 7 dni, czas polski) zmienia tylko sprzedaż: zamówienia `paid`, `shipped` i `delivered`
    z `paid_at` w okresie, wartość z cen z chwili zakupu. Reszta pulpitu to stan na teraz.
  - Liczby liczy API: `GET /orders/manage/summary?days=`, a dla płyt `GET /products/manage` z filtrami
    `ready=true` (gotowe szkice) i `available=true` (stan magazynu, ten sam zbiór co `/produkty?dostepne=1`).
- **Widok zamówienia:** kupujący (imię, e-mail, telefon, adres albo paczkomat), płyty ze zdjęciem i stanem,
  kwota, status płatności, historia zmian. Przyciski:
  - **Wyślij** (dawniej „Sprzedaj”): otwiera ustawienia przesyłki. Sprzedaż dokonuje się przy płatności.
  - **Anuluj**: z powodem, który dostanie klient. Przywraca płyty do sprzedaży; po opłaceniu robi zwrot
    pieniędzy (Stripe).
  - **Napisz**: e-mail do kupującego, z szablonami („wysłane”, „pytanie o stan”, „opóźnienie”).
- **Rezerwacja płyty:** od przejścia do płatności, z limitem (propozycja: 15 minut). Używane płyty mają zwykle
  jedną sztukę, więc dwie osoby nie mogą jej kupić naraz. Dziś API zdejmuje stan już przy złożeniu zamówienia,
  co działa jak rezerwacja bez limitu czasu.
- **Wiadomości:** na start zwykłe maile z panelu, zapisane przy zamówieniu. Rozmowa na koncie klienta w sklepie
  może przyjść później.
- **Wysyłka:** InPost przez API ShipX (przesyłka, etykieta albo kod nadania, numer śledzenia w mailu do
  klienta). Paczkomat wybiera klient w sklepie (mapa InPost). Na kraje poza zasięgiem InPost potrzebny drugi
  przewoźnik albo poczta: do ustalenia.
- **Płatności:** Stripe; zamówienie staje się opłacone po potwierdzeniu z webhooka, nie po powrocie klienta ze
  strony płatności. Do czasu Stripe panel ma „Oznacz jako opłacone” (np. przelew tradycyjny).

## Statusy zamówienia

`pending` (czeka na płatność) → `paid` (opłacone, do wysłania) → `shipped` (wysłane) → `delivered` (doręczone,
później z InPost). Z `pending` i `paid` można przejść do `cancelled`. Każda zmiana zapisuje czas (`paid_at`,
`shipped_at`, `cancelled_at`), anulowanie także powód.

## Kolejność prac

1. **API: statusy i obsługa w panelu** (zrobione 2026-11-09: migracja 018, `orders:manage`, `GET /orders/manage`,
   `GET /orders/manage/{id}`, `POST /orders/{id}/mark-paid`, `POST /orders/{id}/cancel`)
   - migracja: ograniczenie statusów, czasy zmian, powód anulowania
   - lista zamówień dla panelu z filtrem statusu i danymi kupującego
   - szczegóły zamówienia dla panelu: kupujący, adres, pozycje ze zdjęciem
   - anulowanie z powodem (przywraca stan), „oznacz jako opłacone”
2. **Panel: pulpit „Do wysłania” i widok zamówienia** z przyciskami Anuluj, Wyślij (na razie bez przewoźnika),
   Napisz (na razie link do maila) (zrobione 2026-11-09)
3. **Wiadomości:** wysyłka maila z panelu z szablonami, historia przy zamówieniu, mail do klienta przy zmianie
   statusu
4. **Płatności Stripe:** checkout w sklepie, webhook, zwrot przy anulowaniu, rezerwacja z limitem czasu
5. **Wysyłka InPost:** wybór paczkomatu w sklepie, przesyłka i etykieta z panelu, numer śledzenia, status
   doręczenia
6. **Powiadomienia dla właściciela** o nowym opłaconym zamówieniu (mail, później push)

## Otwarte pytania

- Przewoźnik dla krajów poza InPost.
- Czy klient może anulować sam przed wysyłką.
- Faktury i VAT przy sprzedaży za granicę (do omówienia z księgowym, jak w TODO API).
