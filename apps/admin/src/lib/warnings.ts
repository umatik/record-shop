/** Ostrzeżenia z API (publikacja, widok produktu) po polsku; nieznane kody pokazujemy wprost. */
const WARNING_LABEL: Record<string, string> = {
  missing_preview: "Płyta nie ma odsłuchu. Dodaj link do YouTube albo Bandcamp.",
};

export const describeWarning = (code: string) => WARNING_LABEL[code] ?? code;
