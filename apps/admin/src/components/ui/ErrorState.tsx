import { Alert } from "@mantine/core";

type ErrorStateProps = {
  message: string;
};

/** Błąd ładowania albo zapisu; Mantine `Alert` ma `role="alert"`. */
const ErrorState = ({ message }: ErrorStateProps) => (
  <Alert color="red" variant="light" fz="md">
    {message}
  </Alert>
);

export default ErrorState;
