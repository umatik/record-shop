import { createTheme, type CSSVariablesResolver } from "@mantine/core";
import { adminColors, adminSurfaces } from "./admin-palette";
import camoColors from "./camo-colors.json";

/**
 * Motyw panelu oparty na moro: oliwka dla akcji, grafit dla tekstu i ciepłe, jasne tła.
 * Statusy mają osobne ziemiste skale: success (zieleń), warning (ochra), danger (cegła).
 *
 * Czytelność przede wszystkim (panel obsługuje się z telefonu): bazowy tekst 18 px. Komponenty używają
 * nazwanych rozmiarów (`fz="xxl"`, `order={2}`), nie liczb, żeby zmiana skali była w jednym miejscu.
 */
export const theme = createTheme({
  white: adminSurfaces.surface,
  black: camoColors.camoCharcoal,
  primaryColor: "camoOlive",
  primaryShade: 6,
  colors: adminColors,
  defaultRadius: "md",
  fontFamily: "var(--font-figtree), system-ui, sans-serif",
  fontSizes: {
    xs: "0.875rem", // 14 px: przypisy
    sm: "1rem", // 16 px: opisy pod polami, drugi wiersz na liście (tytuł płyty)
    md: "1.125rem", // 18 px: tekst bazowy, pierwszy wiersz na liście (artysta, kupujący)
    lg: "1.25rem", // 20 px: wyróżniony tekst
    xl: "1.375rem", // 22 px: kwoty
    xxl: "1.5rem", // 24 px: etykiety dużych pól (cena, ilość, stan)
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
    Input: { classNames: { wrapper: "admin-input" } },
    TextInput: { defaultProps: { size: "md" } },
    Textarea: { defaultProps: { size: "md" } },
    PasswordInput: { defaultProps: { size: "md" } },
    Badge: { defaultProps: { tt: "none" } },
    Paper: { styles: { root: { backgroundColor: "var(--admin-surface)" } } },
    AppShell: {
      styles: {
        navbar: { backgroundColor: "var(--admin-surface)" },
        footer: { backgroundColor: "var(--admin-surface)" },
      },
    },
    Modal: { styles: { header: { backgroundColor: "var(--admin-surface)" } } },
  },
});

/** Miniatura płyty na listach (okładka albo label), w pikselach. */
export const THUMB_SIZE = 91;

/**
 * Kolory moro jako zmienne CSS (`--camo-charcoal`, `--camo-dark-olive`, `--camo-olive`, `--camo-khaki`),
 * z tego samego pliku co motyw i generator wzoru, żeby kolor zmieniało się w jednym miejscu.
 */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: Object.fromEntries(
    Object.entries(camoColors).map(([name, hex]) => [`--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, hex]),
  ),
  light: {
    "--admin-surface": adminSurfaces.surface,
    "--admin-input": adminSurfaces.input,
    "--admin-control-border": adminSurfaces.controlBorder,
    "--mantine-color-body": adminSurfaces.canvas,
    "--mantine-color-placeholder": adminColors.gray[6],
    "--mantine-color-error": "var(--mantine-color-danger-6)",
    "--mantine-color-success": "var(--mantine-color-success-6)",
  },
  dark: {},
});
