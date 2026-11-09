"use client";

import { ActionIcon, Badge, Image } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useFilePreview } from "@/hooks/useFilePreview";

type PhotoPreviewProps = {
  file: File;
  alt: string;
  /** Napis na zdjęciu, np. „Główne · label”. */
  badge?: string;
  onRemove?: () => void;
};

/** Podgląd wybranego zdjęcia, opcjonalnie z plakietką i przyciskiem usunięcia. */
const PhotoPreview = ({ file, alt, badge, onRemove }: PhotoPreviewProps) => {
  const url = useFilePreview(file);

  return (
    <figure style={{ position: "relative", margin: 0 }}>
      <Image src={url} alt={alt} radius="md" h={192} fit="cover" />
      {badge && (
        <Badge component="figcaption" size="lg" color="dark" style={{ position: "absolute", left: 8, bottom: 8 }}>
          {badge}
        </Badge>
      )}
      {onRemove && (
        <ActionIcon
          onClick={onRemove}
          size="xl"
          radius="xl"
          color="dark"
          variant="filled"
          aria-label={`Usuń: ${alt}`}
          style={{ position: "absolute", top: 8, right: 8 }}
        >
          <IconX size={22} aria-hidden="true" />
        </ActionIcon>
      )}
    </figure>
  );
};

export default PhotoPreview;
