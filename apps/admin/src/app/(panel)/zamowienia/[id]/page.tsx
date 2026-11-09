import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/orders/OrderDetail";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  return <OrderDetail orderId={id} />;
}
