import OrdersHistory from "@/components/orders/OrdersHistory";
import { ORDER_STATUSES } from "@/components/orders/orderStatus";
import type { OrderStatus } from "@/types/order";

const isDay = (value: string | undefined) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "");

/** Historia zamówień; filtry siedzą w adresie, więc powrót z zamówienia pokazuje tę samą listę. */
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; od?: string; do?: string; szukaj?: string }>;
}) {
  const params = await searchParams;
  const status = ORDER_STATUSES.find((value) => value === params.status) as OrderStatus | undefined;

  return (
    <OrdersHistory
      {...(status && { status })}
      from={isDay(params.od)}
      to={isDay(params.do)}
      initialSearch={params.szukaj ?? ""}
    />
  );
}
