import { Avatar } from "@mantine/core";
import { IconDisc } from "@tabler/icons-react";
import { THUMB_SIZE } from "@/lib/theme";

type RecordThumbProps = {
  /** Adres zdjęcia; bez niego ikona płyty. */
  src: string | null | undefined;
};

/** Miniatura płyty na listach. Ozdobna: nazwę płyty czyta się z tekstu obok. */
const RecordThumb = ({ src }: RecordThumbProps) => (
  <Avatar src={src ?? null} radius="sm" size={THUMB_SIZE} alt="" style={{ alignSelf: "flex-start" }}>
    <IconDisc size={THUMB_SIZE * 0.42} aria-hidden="true" />
  </Avatar>
);

export default RecordThumb;
