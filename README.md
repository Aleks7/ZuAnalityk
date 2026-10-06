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
- Bramki: niebieskie `+N` / `xN` dodają żołnierzy, zielone zwiększają szybkość strzelania lub moc,
  czerwone `-N` / `÷N` zabierają żołnierzy. Pociski przelatują przez bramki.
- Wrogowie zawsze idą jedną stroną drogi — można ich ominąć albo pokonać i zebrać łupy,
  które zostawiają (żołnierze, szybkość, moc). Wchodzisz w łup, żeby go zebrać.
- Na końcu etapu czeka boss. Po jego pokonaniu gra staje i wybierasz **nagrodę specjalną**
  (posiłki, szybki spust, ciężka amunicja, podwójna lufa, tarcza, magnes albo pomocnik:
  dron, pies bojowy, nalot, sokół zbieracz). Potem biegniesz dalej tym samym oddziałem.
- Gra kończy się, gdy stracisz wszystkich żołnierzy. Rekord zapisuje się w przeglądarce.

## Struktura

- `src/scenes/` — sceny: start (tekstury), menu, gra, nagroda, koniec gry,
- `src/game/` — oddział, bramki, łupy, generator etapów, nagrody,
- `src/game/helpers/` — pomocnicy (dron, pies, samolot, sokół),
- `src/config.ts` — stałe balansu (prędkości, HP, długość etapów…).

## Publikacja

Każdy push na `main` buduje grę i publikuje ją na GitHub Pages (`.github/workflows/pages.yml`).
