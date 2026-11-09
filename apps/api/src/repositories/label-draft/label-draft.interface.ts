import type { PoolClient } from "pg";

/** Jak długo nieukończony szkic z kreatora czeka na dokończenie; potem sprzątanie usuwa go razem z plikami. */
export const LABEL_DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type LabelDraftPhoto = {
  id: string;
  path: string;
  contentType: string;
};

export type LabelDraft = {
  id: string;
  photos: LabelDraftPhoto[];
  /** Stan kreatora z chwili zapisu (odczyt, kandydaci, dane płyty); API go nie interpretuje. */
  state: unknown;
  createdAt: Date;
};

/**
 * Szkic z kreatora to grupa zdjęć labelu w `pending_uploads` ze wspólnym `draft_id`. Powstaje z oczekujących
 * zdjęć z odczytu labelu, gdy kreator dojdzie do danych płyty. Zdjęcia zabiera `PendingUploadRepository.claim`
 * przy zapisie płyty, więc szkic znika razem z nimi.
 */
export interface LabelDraftRepository {
  /** Szkice od najnowszego; z `id` tylko ten jeden. */
  list(client: PoolClient, id?: string): Promise<LabelDraft[]>;

  /** Blokuje szkic do końca transakcji (także taki, którego jeszcze nie ma) i zwraca jego zdjęcia. */
  lock(client: PoolClient, id: string): Promise<LabelDraftPhoto[]>;

  /**
   * Dołącza do szkicu oczekujące zdjęcia spoza szkiców, nie starsze niż `maxAgeMs`, w podanej kolejności.
   * Zwraca identyfikatory dołączonych; wywołujący sprawdza, czy są wszystkie.
   */
  attachPending(client: PoolClient, id: string, photoIds: string[], maxAgeMs: number): Promise<string[]>;

  /** Ustawia kolejność zdjęć szkicu i zapisuje stan kreatora przy pierwszym z nich. */
  saveState(client: PoolClient, id: string, photoIds: string[], state: unknown): Promise<void>;

  /** Usuwa podane zdjęcia szkicu (te, których kreator już nie używa). */
  deletePhotos(client: PoolClient, id: string, photoIds: string[]): Promise<void>;

  /** Usuwa szkice, których najnowsze zdjęcie jest starsze niż `olderThan`, i zwraca zdjęcia do skasowania. */
  deleteAbandoned(client: PoolClient, olderThan: Date): Promise<LabelDraftPhoto[]>;
}
