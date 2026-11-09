import { Group, NumberInput, Text } from "@mantine/core";

type PriceFieldProps = {
  /** Euro, tak jak wpisane (puste pole to ""). */
  value: number | string;
  onChange: (value: number | string) => void;
  error?: string | null;
};

/** Cena w euro z centami: etykieta i pole w jednej linii, dopisek o złotówkach pod polem. */
const PriceField = ({ value, onChange, error }: PriceFieldProps) => (
  <Group gap="md" wrap="nowrap" align="flex-start">
    <Text component="label" htmlFor="variant-price" fw={800} fz="xxl" lh="60px">
      Cena
    </Text>
    <NumberInput
      id="variant-price"
      size="xl"
      style={{ flex: 1 }}
      value={value}
      onChange={onChange}
      min={0}
      suffix=" €"
      placeholder="0 €"
      hideControls
      // Klawiatura numeryczna z przecinkiem; kropka z klawiatur Androida też działa jako separator.
      inputMode="decimal"
      decimalScale={2}
      decimalSeparator=","
      allowedDecimalSeparators={[",", "."]}
      allowNegative={false}
      description="W euro. Cenę w złotych policzy sklep według kursu NBP."
      inputWrapperOrder={["input", "description", "error"]}
      styles={{ description: { fontSize: "var(--mantine-font-size-md)", marginTop: 6 } }}
      error={error}
    />
  </Group>
);

export default PriceField;
