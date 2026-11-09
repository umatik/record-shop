import { Divider, Stack } from "@mantine/core";
import { IconCircleCheck } from "@tabler/icons-react";
import { count, pluralize } from "@/lib/format";
import type { OrderSummary } from "@/types/order";
import AttentionRow from "./AttentionRow";
import PendingOrders from "./PendingOrders";
import SectionHeading from "./SectionHeading";

type AttentionSectionProps = {
  /** Płatności oczekujące; `undefined`, gdy brak danych albo uprawnień. */
  pending: OrderSummary["pending"] | undefined;
  /** Szkice gotowe do publikacji; `undefined`, gdy brak danych albo uprawnień. */
  readyDrafts: number | undefined;
};

/** „Wymaga uwagi”: pokazuje tylko wiersze, w których coś jest, a bez nich znika cała. */
const AttentionSection = ({ pending, readyDrafts }: AttentionSectionProps) => {
  const hasPending = !!pending?.count;
  const hasReady = !!readyDrafts;

  if (!hasPending && !hasReady) return null;

  return (
    <Stack component="section" aria-labelledby="attention-title" gap={0}>
      <Divider mb="lg" />
      <SectionHeading id="attention-title" title="Oczekuje na płatność" />
      {hasPending && <PendingOrders pending={pending} />}
      {hasPending && hasReady && <Divider />}
      {hasReady && (
        <AttentionRow
          icon={IconCircleCheck}
          color="success"
          title={`${count(readyDrafts, ["szkic", "szkice", "szkiców"])} ${pluralize(readyDrafts, ["gotowy", "gotowe", "gotowych"])} do publikacji`}
          description="Mają wariant, zdjęcie i odsłuch"
          href="/szkice?gotowe=1"
        />
      )}
    </Stack>
  );
};

export default AttentionSection;
