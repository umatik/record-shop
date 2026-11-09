"use client";

import { Image, Modal, Stack } from "@mantine/core";
import type { ReactNode } from "react";

type PhotoViewerProps = {
  /** Adres pokazywanego zdjęcia; bez niego okno jest zamknięte. */
  src: string | null;
  alt: string;
  onClose: () => void;
  /** Akcje pod zdjęciem, np. „Ustaw jako główne”. */
  actions?: ReactNode;
};

/** Zdjęcie w pełnym rozmiarze na ciemnym tle. Zamyka się krzyżykiem, Escape albo dotknięciem zdjęcia. */
const PhotoViewer = ({ src, alt, onClose, actions }: PhotoViewerProps) => (
  <Modal
    opened={src !== null}
    onClose={onClose}
    title={alt}
    fullScreen
    styles={{
      content: { background: "var(--mantine-color-black)" },
      header: { background: "var(--mantine-color-black)", color: "var(--mantine-color-white)" },
      close: { color: "var(--mantine-color-white)" },
      body: { height: "calc(100dvh - 60px)" },
    }}
  >
    <Stack h="100%" gap="md" justify="center" align="center">
      {src && (
        <Image
          src={src}
          alt={alt}
          fit="contain"
          mah={actions ? "calc(100% - 80px)" : "100%"}
          maw="100%"
          onClick={onClose}
        />
      )}
      {actions}
    </Stack>
  </Modal>
);

export default PhotoViewer;
