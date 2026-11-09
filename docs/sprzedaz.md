# Etap sprzedaży: zamówienia, płatności, wysyłka

Plan z 2026-11-08. Pulpit panelu pokazuje to, co wymaga reakcji właściciela, a przede wszystkim opłacone
zamówienia do wysłania. Ten plik zbiera decyzje i kolejność prac. Szczegóły kodu są w `apps/api` i `apps/admin`.

## Decyzje

- **Pulpit = „Do wysłania”.** Opłacone zamówienia, najstarsze na górze, z płytą, kupującym, kwotą i liczbą dni
  oczekiwania. Pod spodem, tylko gdy coś w nich jest: „Czeka na płatność” i „Wiadomości bez odpowiedzi”.
  Pusty stan: „Nic do wysłania”.
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
