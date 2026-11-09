import { Alert, Button, Stack, Text } from "@mantine/core";
import type { ProductMatch } from "@/types/lookup";

type ExistingProductsAlertProps = {
  matches: ProductMatch[];
  destination: number | "new" | null;
  onChange: (value: number | "new") => void;
};

const MATCH_REASON: Record<ProductMatch["matchedBy"][number], string> = {
  discogs_release: "to samo wydanie",
  catalog_number: "ten sam numer katalogowy",
  discogs_master: "to samo nagranie, inne wydanie",
  title_artist: "ten sam album, inne tłoczenie",
};

const REASON_ORDER = ["discogs_release", "catalog_number", "discogs_master", "title_artist"] as const;

const recordName = (match: ProductMatch) => [match.artists.join(", "), match.title].filter(Boolean).join(" – ");

/** Dopisek po nazwie: najmocniejszy powód dopasowania i ewentualnie „szkic”. */
const matchNote = (match: ProductMatch) =>
  [
    // Tylko najmocniejszy powód: „to samo wydanie” razem z „inne tłoczenie” brzmiałoby sprzecznie.
    REASON_ORDER.filter((reason) => match.matchedBy.includes(reason)).map((reason) => MATCH_REASON[reason])[0],
    match.isPublished ? null : "szkic",
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * Płyta, która już jest w sklepie: domyślnie nowa sztuka trafia do niej jako wariant (pierwsze, najlepsze
 * dopasowanie). Przycisk przełącza na zapis jako nowy produkt i z powrotem.
 */
const ExistingProductsAlert = ({ matches, destination, onChange }: ExistingProductsAlertProps) => {
  const match = matches[0];
  if (!match) return null;
  const exact = match.matchedBy.includes("discogs_release");
  const asNew = destination === "new";

  return (
    <Alert
      color={exact ? "blue" : "yellow"}
      variant="light"
      title={exact ? "To wydanie jest już w katalogu" : "Ta płyta jest już w katalogu"}
      fz="md"
    >
      <Stack gap="sm">
        <Text fz="md">
          {asNew ? (
            "Zapiszesz ją jako osobny, nowy produkt."
          ) : (
            <>
              Dodasz ją jako wariant do płyty
              <br />
              <strong>{recordName(match)}</strong>
              {matchNote(match) && (
                <>
                  <br />
                  {matchNote(match)}
                </>
              )}
            </>
          )}
        </Text>
        <Button variant="default" size="md" w="fit-content" onClick={() => onChange(asNew ? match.productId : "new")}>
          {asNew ? "Dodaj jako wariant" : "Nowy produkt"}
        </Button>
      </Stack>
    </Alert>
  );
};

export default ExistingProductsAlert;
