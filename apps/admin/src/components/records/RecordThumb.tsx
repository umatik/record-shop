import { Avatar, Badge, Box } from "@mantine/core";
import { IconDisc } from "@tabler/icons-react";
import { count } from "@/lib/format";
import { THUMB_SIZE } from "@/lib/theme";

type RecordThumbProps = {
  /** Adres zdjęcia; bez niego ikona płyty. */
  src: string | null | undefined;
  /** Liczba wariantów w plakietce na rogu miniatury; bez niej plakietki nie ma. */
  variants?: number;
  /** Bok zdjęcia w px; domyślnie rozmiar z list. */
  size?: number;
};

/** Miniatura płyty na listach, z obrysem w najciemniejszym kolorze moro. Ozdobna: nazwę płyty czyta się z tekstu obok. */
const RecordThumb = ({ src, variants, size = THUMB_SIZE }: RecordThumbProps) => (
  // Padding równy zasięgowi obrysu (2 px odstępu + 2 px linii): obrys mieści się w polu i nie wystaje poza krawędź treści.
  <Box pos="relative" p={4} style={{ alignSelf: "flex-start", flexShrink: 0 }}>
    <Avatar
      src={src ?? null}
      radius="sm"
      size={size}
      alt=""
      // Odstęp między obrysem a zdjęciem taki sam jak grubość obrysu.
      style={{ outline: "2px solid var(--camo-charcoal)", outlineOffset: 2 }}
    >
      <IconDisc size={size * 0.42} aria-hidden="true" />
    </Avatar>
    {variants !== undefined && (
      <Badge color="camoCharcoal" size="lg" circle pos="absolute" top={-9} right={-9}>
        <span aria-hidden="true">{variants}</span>
        <span className="sr-only">{count(variants, ["wariant", "warianty", "wariantów"])}</span>
      </Badge>
    )}
  </Box>
);

export default RecordThumb;
