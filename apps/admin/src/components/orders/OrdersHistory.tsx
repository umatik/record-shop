"use client";

import { Button, CloseButton, Group, NativeSelect, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconDownload, IconMail, IconSearch } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import RowList from "@/components/records/RowList";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import PageTitle from "@/components/ui/PageTitle";
import { useOrderList } from "@/hooks/useOrders";
import { count } from "@/lib/format";
import { orderExportHref, sendOrdersExport } from "@/services/orders.services";
import type { OrderStatus } from "@/types/order";
import OrderRow from "./OrderRow";
import { ORDER_STATUS, ORDER_STATUSES } from "./orderStatus";

type OrdersHistoryProps = {
  /** Filtry z adresu (`?status=`, `?od=`, `?do=`, `?szukaj=`); bez nich cała historia. */
  status?: OrderStatus;
  from?: string;
  to?: string;
  initialSearch?: string;
};

const STATUS_OPTIONS = [
  { value: "", label: "Wszystkie statusy" },
  ...ORDER_STATUSES.map((value) => ({ value, label: ORDER_STATUS[value].label })),
];

/**
 * Historia zamówień: wszystkie zamówienia od najnowszych, z wyszukiwaniem po kupującym albo numerze, filtrem
 * statusu i zakresem dat złożenia. Filtry trafiają do adresu, a lista dociąga kolejne strony („Pokaż więcej”).
 */
const OrdersHistory = ({ status, from = "", to = "", initialSearch = "" }: OrdersHistoryProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(initialSearch);
  const searchRef = useRef<HTMLInputElement>(null);
  const [q] = useDebouncedValue(search.trim(), 300);

  const list = useOrderList({
    sort: "newest",
    ...(status && { status }),
    ...(from && { from }),
    ...(to && { to }),
    ...(q && { q }),
  });

  /** Adres listy po zmianie jednego z filtrów; replace, żeby filtrowanie nie zapychało historii przeglądarki. */
  const show = (next: { status?: string; from?: string; to?: string; q?: string }) => {
    const filters = { status: status ?? "", from, to, q, ...next };
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.from) params.set("od", filters.from);
    if (filters.to) params.set("do", filters.to);
    if (filters.q) params.set("szukaj", filters.q);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (q !== initialSearch) show({ q });
    // Reagujemy tylko na zmianę frazy; reszta adresu idzie z tego samego renderu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const clearSearch = () => {
    setSearch("");
    searchRef.current?.focus();
  };

  const filtered = !!(status || from || to || q);
  const filters = {
    sort: "newest" as const,
    ...(status && { status }),
    ...(from && { from }),
    ...(to && { to }),
    ...(q && { q }),
  };

  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const mail = async () => {
    setSending(true);
    setNotice(null);
    try {
      const result = await sendOrdersExport(filters, "pdf");
      setNotice({
        ok: true,
        text: `Wysłano ${result.filename} (${count(result.orders, ["zamówienie", "zamówienia", "zamówień"])}).`,
      });
    } catch (error) {
      setNotice({ ok: false, text: error instanceof Error ? error.message : "Nie udało się wysłać eksportu." });
    } finally {
      setSending(false);
    }
  };

  return (
    <Stack component="section" aria-labelledby="orders-title" gap="lg" maw={640} mx="auto">
      <PageTitle
        id="orders-title"
        title="Zamówienia"
        aside={list.total !== undefined ? count(list.total, ["zamówienie", "zamówienia", "zamówień"]) : undefined}
      />

      <TextInput
        ref={searchRef}
        type="search"
        size="lg"
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        onKeyDown={(event) => event.key === "Escape" && search && clearSearch()}
        placeholder="Szukaj kupującego"
        leftSection={<IconSearch size={22} aria-hidden="true" />}
        rightSectionWidth={52}
        rightSectionPointerEvents="all"
        rightSection={
          search && <CloseButton size="lg" iconSize={22} onClick={clearSearch} aria-label="Wyczyść wyszukiwanie" />
        }
        aria-label="Szukaj: imię, nazwisko, e-mail albo numer zamówienia"
      />

      <Stack component="fieldset" gap="sm" m={0} p={0} style={{ border: 0 }}>
        <legend className="sr-only">Filtry historii zamówień</legend>
        <NativeSelect
          aria-label="Status zamówienia"
          data={STATUS_OPTIONS}
          value={status ?? ""}
          onChange={(event) => show({ status: event.currentTarget.value })}
        />
        <SimpleGrid cols={2} spacing="sm">
          <TextInput
            type="date"
            label="Złożone od"
            value={from}
            max={to || undefined}
            onChange={(event) => show({ from: event.currentTarget.value })}
          />
          <TextInput
            type="date"
            label="Złożone do"
            value={to}
            min={from || undefined}
            onChange={(event) => show({ to: event.currentTarget.value })}
          />
        </SimpleGrid>
        {filtered && (
          <Button
            variant="subtle"
            size="sm"
            px="xs"
            w="fit-content"
            onClick={() => {
              setSearch("");
              router.replace(pathname, { scroll: false });
            }}
          >
            Wyczyść filtry
          </Button>
        )}
      </Stack>

      <Stack gap="xs" component="section" aria-label="Eksport historii">
        <Group gap="sm" wrap="wrap">
          <Button
            component="a"
            href={orderExportHref(filters, "pdf")}
            variant="light"
            leftSection={<IconDownload size={18} aria-hidden="true" />}
            disabled={list.total === 0}
          >
            Pobierz PDF
          </Button>
          <Button
            component="a"
            href={orderExportHref(filters, "csv")}
            variant="light"
            leftSection={<IconDownload size={18} aria-hidden="true" />}
            disabled={list.total === 0}
          >
            Pobierz CSV
          </Button>
          <Button
            variant="default"
            onClick={() => void mail()}
            loading={sending}
            disabled={list.total === 0}
            leftSection={<IconMail size={18} aria-hidden="true" />}
          >
            Wyślij PDF mailem
          </Button>
        </Group>
        {notice && (
          <Text role={notice.ok ? "status" : "alert"} fz="sm" c={notice.ok ? "success.8" : "danger.8"}>
            {notice.text}
          </Text>
        )}
      </Stack>

      {list.isPending && <LoadingState label="Ładowanie zamówień" height={300} />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => void list.refetch()} />}
      {list.total === 0 && (
        <EmptyState title={filtered ? "Żadne zamówienie nie pasuje do filtrów." : "Nie ma jeszcze zamówień."} />
      )}

      <RowList
        items={list.orders}
        getKey={(order) => order.id}
        renderItem={(order) => <OrderRow order={order} history />}
        label="Zamówienia"
      />

      {list.hasNextPage && (
        <Button
          variant="light"
          size="lg"
          fullWidth
          loading={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          Pokaż więcej
        </Button>
      )}
    </Stack>
  );
};

export default OrdersHistory;
