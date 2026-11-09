import { Alert, Button, Stack } from "@mantine/core";

type ErrorStateProps = {
  message: string;
  /** Ponowienie zapytania; bez tego sam komunikat. */
  onRetry?: () => void;
};

/** Błąd ładowania albo zapisu; Mantine `Alert` ma `role="alert"`. */
const ErrorState = ({ message, onRetry }: ErrorStateProps) => (
  <Alert color="danger" variant="light" fz="md">
    <Stack gap="sm" align="flex-start">
      {message}
      {onRetry && (
        <Button variant="light" color="danger" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      )}
    </Stack>
  </Alert>
);

export default ErrorState;
