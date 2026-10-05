# Squad Rush

Przeglądarkowa gra w stylu „runnerów z reklam”: oddział żołnierzy cały czas idzie do góry,
strzela do przeciwników, a gracz wybiera bramki z ulepszeniami — **lewo albo prawo**.

## Jak uruchomić

Otwórz `index.html` w przeglądarce (bez instalacji, bez serwera). Działa na komputerze i telefonie.

Opcjonalnie lokalny serwer: `python3 -m http.server` i wejdź na http://localhost:8000.

## Sterowanie

- przeciąganie palcem / myszką w lewo i prawo,
- klawisze ← → lub A / D,
- Enter / spacja — start / następny poziom.

## Zasady

- Liczba nad oddziałem to liczba żołnierzy — to jednocześnie Twoje życie.
- Bramki: niebieskie `+N` / `xN` dodają żołnierzy, zielone zwiększają szybkość strzelania lub moc,
  czerwone `-N` / `÷N` zabierają żołnierzy.
- Strzały w bramkę podbijają jej wartość (czerwona `-N` może zmienić się w `+1`).
- Wrogowie (czerwoni, fioletowi „brutale”) zabijają żołnierzy przy kontakcie.
- Na końcu poziomu czeka boss — pokonaj go, zanim zmiażdży oddział.
- Każdy kolejny poziom jest dłuższy i trudniejszy. Postęp i rekord zapisują się w przeglądarce.

## Pliki

- `index.html` — strona i ekrany menu,
- `style.css` — wygląd UI,
- `game.js` — cała logika gry (Canvas 2D, bez zależności).

## Publikacja

Każdy push na `main` publikuje grę na GitHub Pages (workflow `.github/workflows/pages.yml`):
https://aleks7.github.io/ZuAnalityk/
