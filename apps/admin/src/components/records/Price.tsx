import { Text } from "@mantine/core";
import { formatEur } from "@/lib/format";

type PriceProps = {
  /** Eurocenty. */
  cents: number | undefined;
};

/** Cena w prawej kolumnie wiersza, bez łamania. */
const Price = ({ cents }: PriceProps) =>
  cents === undefined ? null : (
    <Text fw={700} fz="xl" style={{ whiteSpace: "nowrap" }}>
      {formatEur(cents)}
    </Text>
  );

export default Price;
