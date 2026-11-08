import { createTheme } from "@mantine/core";

/**
 * Marka jest czarno-biała (logo, typografia), a akcje i stany mają standardowe kolory:
 * niebieski dla akcji, żółty dla szkiców i braków, zielony dla gotowych.
 */
export const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  // Czytelność przede wszystkim: bazowy tekst 18 px zamiast 16 px.
  fontSizes: { xs: "0.875rem", sm: "1rem", md: "1.125rem", lg: "1.25rem", xl: "1.375rem" },
  fontFamily: "var(--font-figtree), system-ui, sans-serif",
  headings: { fontFamily: "var(--font-figtree), system-ui, sans-serif", fontWeight: "800" },
  // Mobile first: wygodne cele dotyku.
  components: {
    Button: { defaultProps: { size: "md" } },
    TextInput: { defaultProps: { size: "md" } },
    PasswordInput: { defaultProps: { size: "md" } },
    Badge: { defaultProps: { tt: "none" } },
  },
});
