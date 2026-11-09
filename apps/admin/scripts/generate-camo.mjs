// Generuje bezszwowy kafelek „geometrycznego moro” do tła logowania i nagłówka panelu.
// Własny wzór (nie kopia zdjęcia), w stylu moro „splinter”: siatka mocno przesuniętych punktów podzielona
// na trójkąty (losowa przekątna w każdym oczku); sąsiednie trójkąty często dziedziczą kolor, więc zlewają się
// w duże kanciaste kliny o długich prostych krawędziach. Siatka zawija się na krawędziach (bez szwów).
// Uruchomienie: node scripts/generate-camo.mjs  →  public/patterns/camo.svg
import { writeFileSync } from "node:fs";
import camoColors from "../src/lib/camo-colors.json" with { type: "json" };

const SIZE = 1280; // bok kafelka w px: duży, żeby na szerokim ekranie nie było widać powtórzeń
const GRID = 12; // oczek siatki w rzędzie i kolumnie (oczko ~107 px)
const JITTER = 0.42; // przesunięcie punktów jako ułamek oczka: większe = ostrzejsze kliny
const MERGE = 0.55; // szansa, że trójkąt przejmie kolor sąsiada (większe płaty)
// Od najciemniejszego do najjaśniejszego, jak na wzorze.
const PALETTE = [camoColors.camoCharcoal, camoColors.camoDarkOlive, camoColors.camoOlive, camoColors.camoKhaki];

// Deterministyczny generator liczb losowych, żeby wzór był zawsze taki sam.
let seed = 7;
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
};

const cell = SIZE / GRID;
// Przesunięcie każdego węzła siatki; węzły na krawędziach powtarzają się (indeks modulo GRID), więc kafelek się zamyka.
const jitter = Array.from({ length: GRID }, () =>
  Array.from({ length: GRID }, () => [(random() - 0.5) * 2 * JITTER * cell, (random() - 0.5) * 2 * JITTER * cell]),
);
const node = (col, row) => {
  const [dx, dy] = jitter[((row % GRID) + GRID) % GRID][((col % GRID) + GRID) % GRID];
  return [col * cell + dx, row * cell + dy];
};

// Trójkąty: w każdym oczku losowa przekątna. Kolor: nowy albo przejęty od sąsiada z lewej/z góry.
const colors = new Map();
const triangles = [];
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const [a, b, c, d] = [node(col, row), node(col + 1, row), node(col + 1, row + 1), node(col, row + 1)];
    const halves =
      random() < 0.5
        ? [
            [a, b, c],
            [a, c, d],
          ]
        : [
            [a, b, d],
            [b, c, d],
          ];
    halves.forEach((points, half) => {
      const neighbours = [
        colors.get(`${col - 1},${row},1`),
        colors.get(`${col},${row - 1},1`),
        colors.get(`${col},${row},0`),
      ].filter(Boolean);
      const color =
        neighbours.length > 0 && random() < MERGE
          ? neighbours[Math.floor(random() * neighbours.length)]
          : PALETTE[Math.floor(random() * PALETTE.length)];
      colors.set(`${col},${row},${half}`, color);
      triangles.push({ points, color });
    });
  }
}

// Trójkąt wystający za krawędź rysujemy też przesunięty o bok kafelka, żeby wrócił z drugiej strony.
// Kopie, które w całości wypadają poza kafelek, pomijamy (mniejszy plik).
const OFFSETS = [-SIZE, 0, SIZE];
const insideTile = (points) =>
  points.some(([x]) => x > 0) &&
  points.some(([x]) => x < SIZE) &&
  points.some(([, y]) => y > 0) &&
  points.some(([, y]) => y < SIZE);
const polygons = triangles.flatMap(({ points, color }) =>
  OFFSETS.flatMap((dx) => OFFSETS.map((dy) => points.map(([x, y]) => [x + dx, y + dy])))
    .filter(insideTile)
    .map((shifted) => {
      const d = shifted.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
      // Obrys w kolorze wypełnienia zakrywa włoskowate szczeliny przy wygładzaniu krawędzi.
      return `<polygon points="${d}" fill="${color}" stroke="${color}" stroke-width="1"/>`;
    }),
);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
${polygons.join("\n")}
</svg>
`;

writeFileSync(new URL("../public/patterns/camo.svg", import.meta.url), svg);
console.log(`camo.svg: ${triangles.length} trójkątów, ${(svg.length / 1024).toFixed(1)} KB`);
