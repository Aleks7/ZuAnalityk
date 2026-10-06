# Zu

**Zagraj:** https://aleks7.github.io/ZuAnalityk/

Przeglądarkowa gra w stylu „runnerów z reklam”: oddział żołnierzy cały czas idzie do góry,
strzela do przeciwników, a gracz wybiera bramki z ulepszeniami — **lewo albo prawo**.
Zbudowana na [Phaser 3](https://phaser.io/) + Vite + TypeScript.

## Uruchomienie

```bash
npm install
npm run dev            # serwer deweloperski z podglądem na żywo
npm run build          # wersja do publikacji → dist/
npm run build:offline  # jeden plik HTML do grania bez internetu → dist-offline/index.html
```

## Sterowanie

- przeciąganie palcem / myszką w lewo i prawo,
- klawisze ← → lub A / D,
- 1 / 2 / 3 — wybór nagrody specjalnej.

## Zasady

- Liczba nad oddziałem to liczba żołnierzy — to jednocześnie Twoje życie.
- Bramki dają tylko ulepszenia: niebieskie `+N` / `x2` dodają żołnierzy, zielone zwiększają
  szybkość strzelania lub moc. W parze są zawsze dwa różne bonusy oddzielone ścianą „LUB” —
  bierzesz tylko jeden. Pociski przelatują przez bramki.
- Wrogowie zawsze idą jedną stroną drogi (od etapu 3 naprzemiennie z obu stron) — można ich
  ominąć albo pokonać i zebrać łupy. Wchodzisz w łup, żeby go zebrać.
- Z każdym etapem wrogowie mają wykładniczo więcej HP i dochodzą nowe typy:
  | Wróg | Od etapu | Cecha |
  |---|---|---|
  | Piechur | 1 | podstawowy |
  | Brutal | 1 | dużo HP, zabiera wielu żołnierzy |
  | Biegacz | 2 | bardzo szybki |
  | Tarczownik | 2 | pancerz zmniejsza obrażenia każdego pocisku |
  | Strzelec | 3 | strzela w oddział — unikaj pocisków |
  | Czołg | 4 | ogromne HP i pancerz, zawsze zostawia duży łup |
- Na końcu etapu czeka boss (od etapu 2 strzela salwami, od 4 przywołuje biegaczy).
  Po jego pokonaniu wybierasz **nagrodę specjalną**: posiłki, karabin maszynowy, ciężka amunicja,
  podwójna lufa, tarcza, magnes albo pomocnik (dron, pies bojowy, nalot, sokół zbieracz).
- Pasek na dole ekranu pokazuje obrażenia pocisku, szybkość strzelania, aktywne perki i pomocników.
- Gra kończy się, gdy stracisz wszystkich żołnierzy. Rekord zapisuje się w przeglądarce.

## Struktura

- `src/scenes/` — sceny: start (tekstury), menu, gra, nagroda, koniec gry,
- `src/game/` — oddział, bramki, łupy, generator etapów, nagrody,
- `src/game/helpers/` — pomocnicy (dron, pies, samolot, sokół),
- `src/config.ts` — stałe balansu (prędkości, HP, długość etapów…).

## Publikacja

Każdy push na `main` buduje grę i publikuje ją na GitHub Pages (`.github/workflows/pages.yml`).
