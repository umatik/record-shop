import { Anchor, Paper, Text, Title } from "@mantine/core";
import { buyerName } from "@/lib/format";
import type { OrderBuyer } from "@/types/order";

type BuyerDetailsProps = {
  buyer: OrderBuyer;
};

type DetailProps = {
  label: string;
  children: React.ReactNode;
};

const Detail = ({ label, children }: DetailProps) => (
  <div>
    <Text component="dt" c="dimmed" fz="sm">
      {label}
    </Text>
    <Text component="dd" fz="lg" m={0}>
      {children}
    </Text>
  </div>
);

/** Kupujący jako lista definicji: etykieta i wartość, z klikalnym mailem i telefonem. */
const BuyerDetails = ({ buyer }: BuyerDetailsProps) => {
  const address = [buyer.address, [buyer.postalCode, buyer.city].filter(Boolean).join(" "), buyer.country]
    .filter(Boolean)
    .join(", ");

  return (
    <Paper component="section" aria-labelledby="buyer-title" withBorder radius="md" p="md">
      <Title id="buyer-title" order={3} mb="sm">
        {buyerName(buyer)}
      </Title>
      <dl style={{ display: "grid", gap: "var(--mantine-spacing-sm)", margin: 0 }}>
        <Detail label="E-mail">
          <Anchor href={`mailto:${buyer.email}`} inherit>
            {buyer.email}
          </Anchor>
        </Detail>
        {buyer.phone && (
          <Detail label="Telefon">
            <Anchor href={`tel:${buyer.phone}`} inherit>
              {buyer.phone}
            </Anchor>
          </Detail>
        )}
        <Detail label="Adres">{address || "Brak adresu"}</Detail>
      </dl>
    </Paper>
  );
};

export default BuyerDetails;
