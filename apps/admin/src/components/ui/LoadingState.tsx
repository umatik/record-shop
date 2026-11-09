import { Skeleton } from "@mantine/core";

type LoadingStateProps = {
  /** Tekst dla czytnika ekranu, np. „Ładowanie zamówień”. */
  label: string;
  height?: number;
};

/** Szkielet w miejscu treści, ogłaszany czytnikom ekranu. */
const LoadingState = ({ label, height = 240 }: LoadingStateProps) => (
  <div role="status" aria-live="polite">
    <span className="sr-only">{label}…</span>
    <Skeleton h={height} aria-hidden="true" />
  </div>
);

export default LoadingState;
