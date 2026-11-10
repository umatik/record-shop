"use client";

import { ActionIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useDeleteUser } from "@/hooks/useUsers";
import type { User } from "@/types/user";

type DeleteUserButtonProps = {
  user: User;
};

/** Usunięcie konta z potwierdzeniem; zamówienia tego użytkownika zostają. */
const DeleteUserButton = ({ user }: DeleteUserButtonProps) => {
  const [opened, modal] = useDisclosure(false);
  const deleteUser = useDeleteUser(user.id);

  return (
    <>
      <ActionIcon
        size={44}
        variant="subtle"
        color="danger"
        aria-label={`Usuń użytkownika ${user.email}`}
        onClick={modal.open}
      >
        <IconTrash size={22} aria-hidden="true" />
      </ActionIcon>
      <ConfirmModal
        opened={opened}
        title="Usunąć użytkownika?"
        confirmLabel="Usuń użytkownika"
        danger
        loading={deleteUser.isPending}
        error={deleteUser.error?.message ?? null}
        onConfirm={() => deleteUser.mutate(undefined, { onSuccess: modal.close })}
        onClose={modal.close}
      >
        Konto {user.email} przestanie działać, a użytkownik zniknie z listy. Jego zamówienia zostaną.
      </ConfirmModal>
    </>
  );
};

export default DeleteUserButton;
