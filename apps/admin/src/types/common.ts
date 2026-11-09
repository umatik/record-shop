/** Stronicowanie list z API. */
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/** Błąd walidacji z API: `path` to ścieżka pola, np. `variants.0.attributes.format`. */
export type ApiFieldError = {
  path: string;
  message: string;
};
