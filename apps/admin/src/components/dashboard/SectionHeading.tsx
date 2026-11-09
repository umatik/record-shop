import PageTitle from "@/components/ui/PageTitle";
import type { ReactNode } from "react";

type SectionHeadingProps = {
  id: string;
  title: string;
  /** Dopisek po prawej, np. liczba zamówień albo okres. */
  aside?: ReactNode;
};

/** Nagłówek sekcji pulpitu (`h2`) z dopiskiem po prawej. */
const SectionHeading = ({ id, title, aside }: SectionHeadingProps) => (
  <PageTitle id={id} order={2} title={title} aside={aside} />
);

export default SectionHeading;
