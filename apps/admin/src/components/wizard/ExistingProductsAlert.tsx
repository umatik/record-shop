import { Alert, Radio, Stack } from "@mantine/core";
import type { ProductMatch } from "@/types/lookup";

type ExistingProductsAlertProps = {
  matches: ProductMatch[];
  destination: number | "new" | null;
  onChange: (value: number | "new") => void;
};

const MATCH_REASON: Record<ProductMatch["matchedBy"][number], string> = {
  discogs_release: "to samo wydanie",
  catalog_number: "ten sam numer katalogowy",
  title_artist: "ten sam album, inne tłoczenie",
};

const matchLabel = (match: ProductMatch) =>
  [
    `Dodaj wariant do #${match.productId}: ${[match.artists.join(", "), match.title].filter(Boolean).join(" – ")}`,
    match.matchedBy.map((reason) => MATCH_REASON[reason]).join(", "),
    match.isPublished ? null : "szkic",
  ]
    .filter(Boolean)
    .join(" · ");

/** Płyty, które już są w sklepie: nowa sztuka zwykle powinna być wariantem istniejącego produktu. */
const ExistingProductsAlert = ({ matches, destination, onChange }: ExistingProductsAlertProps) => {
  const exact = matches.some((match) => match.matchedBy.includes("discogs_release"));

  return (
    <Alert
      color={exact ? "blue" : "yellow"}
      variant="light"
      title={exact ? "To wydanie jest już w katalogu" : "Znaleziono podobne płyty"}
      fz="md"
    >
      <Radio.Group
        label="Jak chcesz zapisać tę płytę?"
        value={String(destination ?? "")}
        onChange={(value) => onChange(value === "new" ? value : Number(value))}
      >
        <Stack mt="sm">
          {matches.map((match) => (
            <Radio key={match.productId} value={String(match.productId)} label={matchLabel(match)} />
          ))}
          <Radio value="new" label="Dodaj jako nowy produkt" />
        </Stack>
      </Radio.Group>
    </Alert>
  );
};

export default ExistingProductsAlert;
