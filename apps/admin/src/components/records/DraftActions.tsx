"use client";

import { ActionIcon, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { productKeys } from "@/hooks/queryKeys";

type DraftActionsProps = {
  /** Nazwa szkicu do etykiet przycisków i okna potwierdzenia. */
  name: string;
  editHref: string;
  onDelete: () => Promise<unknown>;
};

/** Edycja i usuwanie szkicu z listy, z potwierdzeniem przed usunięciem. */
const DraftActions = ({ name, editHref, onDelete }: DraftActionsProps) => {
  const [opened, confirm] = useDisclosure(false);
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: onDelete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      confirm.close();
    },
  });

  return (
    <>
      <Group gap="xs" wrap="nowrap">
        <ActionIcon component={Link} href={editHref} size="xl" variant="light" aria-label={`Edytuj: ${name}`}>
          <IconPencil size={22} aria-hidden="true" />
        </ActionIcon>
        <ActionIcon size="xl" variant="subtle" color="red" aria-label={`Usuń: ${name}`} onClick={confirm.open}>
          <IconTrash size={22} aria-hidden="true" />
        </ActionIcon>
      </Group>
      <ConfirmModal
        opened={opened}
        title="Usunąć szkic?"
        confirmLabel="Usuń szkic"
        danger
        loading={remove.isPending}
        error={remove.error?.message ?? null}
        onConfirm={() => remove.mutate()}
        onClose={confirm.close}
      >
        Szkic „{name}” zniknie razem ze zdjęciami. Tego nie da się cofnąć.
      </ConfirmModal>
    </>
  );
};

export default DraftActions;
