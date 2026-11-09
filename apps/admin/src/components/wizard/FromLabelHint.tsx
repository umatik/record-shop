import { Badge } from "@mantine/core";

type FromLabelHintProps = {
  show?: boolean;
};

/** Plakietka przy polu, którego Discogs nie podał, a odczytał je Claude z labelu. */
const FromLabelHint = ({ show }: FromLabelHintProps) =>
  show ? (
    <Badge color="blue" variant="light" size="lg" fz="xs">
      z labelu
    </Badge>
  ) : null;

export default FromLabelHint;
