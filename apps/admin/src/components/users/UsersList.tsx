"use client";

import { ActionIcon, Anchor, Box, Stack, Text } from "@mantine/core";
import Link from "next/link";
import { IconMail } from "@tabler/icons-react";
import RowList from "@/components/records/RowList";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import PageTitle from "@/components/ui/PageTitle";
import { useUserList } from "@/hooks/useUsers";
import { count } from "@/lib/format";
import type { User } from "@/types/user";
import DeleteUserButton from "./DeleteUserButton";

/** Kolumny jak w tabeli: imię i nazwisko, dane teleadresowe, usuwanie, wysyłka maila. */
const COLUMNS = "minmax(0, 1fr) minmax(0, 1.4fr) 44px 44px";

const fullName = (user: User) => [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

/** Wiersz użytkownika. Od sm kolumny jak w tabeli; na telefonie e-mail i telefon schodzą pod nazwisko. */
const UserRow = ({ user }: { user: User }) => {
  const place = [user.postalCode, user.city, user.country].filter(Boolean).join(" ");
  const address = [user.address, place].filter(Boolean).join(", ");
  const name = fullName(user);
  const actions = (
    <>
      <DeleteUserButton user={user} />
      <ActionIcon
        component="a"
        href={`mailto:${user.email}`}
        size={44}
        variant="subtle"
        aria-label={`Napisz do ${name}`}
      >
        <IconMail size={22} aria-hidden="true" />
      </ActionIcon>
    </>
  );
  const contact = (
    <>
      <Text fz="sm" style={{ overflowWrap: "anywhere" }}>
        {user.email}
      </Text>
      {user.phone && (
        <Text fz="sm" c="dimmed">
          {user.phone}
        </Text>
      )}
      {address && (
        <Text fz="sm" c="dimmed" style={{ overflowWrap: "anywhere" }}>
          {address}
        </Text>
      )}
    </>
  );

  return (
    <>
      <Box hiddenFrom="sm" py="md">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text fw={600} fz="md" style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
            {name}
          </Text>
          {actions}
        </div>
        <Stack gap={2} mt={4}>
          {contact}
        </Stack>
      </Box>

      <Box
        visibleFrom="sm"
        style={{ display: "grid", gridTemplateColumns: COLUMNS, gap: 12, alignItems: "center", padding: "16px 0" }}
      >
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fw={600} fz="md" style={{ overflowWrap: "anywhere" }}>
            {name}
          </Text>
          <Anchor component={Link} href={`/zamowienia?szukaj=${encodeURIComponent(user.email)}`} fz="sm">
            {count(user.purchasedCount, ["kupiona płyta", "kupione płyty", "kupionych płyt"])}
          </Anchor>
        </Stack>
        <Stack gap={2} style={{ minWidth: 0 }}>
          {contact}
        </Stack>
        {actions}
      </Box>
    </>
  );
};

/** Lista użytkowników sklepu w kolumnach; „Pokaż więcej” dociąga kolejne strony. */
const UsersList = () => {
  const list = useUserList();

  return (
    <Stack gap="lg" w="100%">
      <PageTitle
        title="Użytkownicy"
        aside={list.total !== undefined ? count(list.total, ["konto", "konta", "kont"]) : null}
      />

      {list.isPending && <LoadingState label="Ładowanie użytkowników" />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => void list.refetch()} />}

      {list.isSuccess && list.users.length === 0 && (
        <EmptyState title="Brak użytkowników" description="Nikt jeszcze nie założył konta." />
      )}

      {list.users.length > 0 && (
        <>
          {/* Nagłówki kolumn są ukryte wizualnie, ale czytnik ekranu je odczyta przed listą. */}
          <Box component="div" className="sr-only">
            <span>Imię i nazwisko</span>
            <span>Dane kontaktowe</span>
          </Box>
          <RowList
            items={list.users}
            getKey={(user) => user.id}
            renderItem={(user) => <UserRow user={user} />}
            label="Użytkownicy"
          />
        </>
      )}

      {list.hasNextPage && (
        <Anchor
          component="button"
          type="button"
          onClick={() => void list.fetchNextPage()}
          disabled={list.isFetchingNextPage}
          fz="md"
        >
          {list.isFetchingNextPage ? "Ładowanie…" : "Pokaż więcej"}
        </Anchor>
      )}
    </Stack>
  );
};

export default UsersList;
