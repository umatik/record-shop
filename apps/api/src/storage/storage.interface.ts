export interface Storage {
  save(file: Buffer, filename: string, contentType: string): Promise<string>;

  /** Kopia pliku pod nową ścieżką; zwraca ścieżkę kopii. */
  copy(from: string, to: string): Promise<string>;

  delete(path: string): Promise<void>;

  exists(path: string): Promise<boolean>;
}
