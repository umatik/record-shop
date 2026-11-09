import { createTheme } from "@mantine/core";

/**
 * Motyw panelu. Marka jest czarno-biała (logo, typografia), a akcje i stany mają standardowe kolory:
 * niebieski dla akcji, żółty dla szkiców i braków, zielony dla gotowych.
 *
 * Czytelność przede wszystkim (panel obsługuje się z telefonu): bazowy tekst 18 px. Komponenty używają
 * nazwanych rozmiarów (`fz="xxl"`, `order={2}`), nie liczb, żeby zmiana skali była w jednym miejscu.
 */
export const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  fontFamily: "var(--font-figtree), system-ui, sans-serif",
  fontSizes: {
    xs: "0.875rem", // 14 px: przypisy
    sm: "1rem", // 16 px: opisy pod polami
    md: "1.125rem", // 18 px: tekst bazowy
    lg: "1.25rem", // 20 px: drugi wiersz na liście (tytuł płyty)
    xl: "1.375rem", // 22 px: kwoty
    xxl: "1.5rem", // 24 px: pierwszy wiersz na liście (artysta, kupujący)
  },
  headings: {
    fontFamily: "var(--font-figtree), system-ui, sans-serif",
    fontWeight: "800",
    sizes: {
      h1: { fontSize: "2rem", lineHeight: "1.2" }, // 32 px: tytuł strony
      h2: { fontSize: "1.5rem", lineHeight: "1.25" }, // 24 px: sekcja
      h3: { fontSize: "1.375rem", lineHeight: "1.3" }, // 22 px: podsekcja
    },
  },
  // Mobile first: wygodne cele dotyku.
  components: {
    Button: { defaultProps: { size: "md" } },
    TextInput: { defaultProps: { size: "md" } },
    PasswordInput: { defaultProps: { size: "md" } },
    Badge: { defaultProps: { tt: "none" } },
  },
});

/** Miniatura płyty na listach (okładka albo label), w pikselach. */
export const THUMB_SIZE = 91;
