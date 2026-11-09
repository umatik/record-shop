import { Anchor, type AnchorProps } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import type { ReactNode } from "react";

type ExternalLinkProps = AnchorProps & {
  href: string;
  children: ReactNode;
};

/**
 * Link poza panel (odsłuch, Discogs): zawsze w nowej karcie, żeby nie zgubić pracy w panelu.
 * `noopener` odcina nową kartę od panelu; ikona i tekst dla czytnika mówią, że otworzy się nowa karta.
 */
const ExternalLink = ({ href, children, ...props }: ExternalLinkProps) => (
  <Anchor href={href} target="_blank" rel="noopener noreferrer" {...props}>
    {children}
    <IconExternalLink size="0.9em" aria-hidden="true" style={{ marginLeft: 4, verticalAlign: "-0.1em" }} />
    <span className="sr-only"> (otwiera się w nowej karcie)</span>
  </Anchor>
);

export default ExternalLink;
