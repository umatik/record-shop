import { Alert, Text } from "@mantine/core";
import type { ProductMatch } from "@/types/lookup";

type ExistingProductsAlertProps = {
  matches: ProductMatch[];
};

const MATCH_REASON: Record<ProductMatch["matchedBy"][number], string> = {
  discogs_release: "to samo wydanie",
  catalog_number: "ten sam numer katalogowy",
  title_artist: "ten sam album, inne tłoczenie",
};

/** Płyty, które już są w sklepie: nowa sztuka zwykle powinna być wariantem istniejącego produktu. */
const ExistingProductsAlert = ({ matches }: ExistingProductsAlertProps) => (
  <Alert color="yellow" variant="light" title="Ta płyta może już być w sklepie" fz="md">
    <ul className="plain-list">
      {matches.map((match) => (
        <Text component="li" key={match.productId} fz="lg">
          <strong>{[match.artists.join(", "), match.title].filter(Boolean).join(" – ")}</strong>
          {" · "}
          {match.matchedBy.map((reason) => MATCH_REASON[reason]).join(", ")}
          {match.isPublished ? "" : " · szkic"}
        </Text>
      ))}
    </ul>
    <Text fz="md" mt="xs">
      Dodanie jako kolejnej sztuki istniejącej płyty pojawi się w następnym kroku.
    </Text>
  </Alert>
);

export default ExistingProductsAlert;
