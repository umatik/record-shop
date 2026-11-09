"use client";

import { Button, Modal, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import ErrorState from "./ErrorState";

type ConfirmModalProps = {
  opened: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  /** Czerwony przycisk dla działań, których nie da się cofnąć. */
  danger?: boolean;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

/** Potwierdzenie działania, np. usunięcia, z jasnym opisem skutków. */
const ConfirmModal = ({
  opened,
  title,
  children,
  confirmLabel,
  danger,
  loading,
  error,
  onConfirm,
  onClose,
}: ConfirmModalProps) => (
  <Modal opened={opened} onClose={onClose} title={title} centered size="lg">
    <Stack gap="md">
      <Text fz="lg" component="div">
        {children}
      </Text>
      {error && <ErrorState message={error} />}
      <Button size="lg" fullWidth color={danger ? "danger" : undefined} loading={loading} onClick={onConfirm}>
        {confirmLabel}
      </Button>
      <Button size="lg" variant="default" fullWidth onClick={onClose}>
        Wróć
      </Button>
    </Stack>
  </Modal>
);

export default ConfirmModal;
