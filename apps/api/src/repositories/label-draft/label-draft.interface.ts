import type { PoolClient } from "pg";

/** Jak długo nieukończony szkic z kreatora czeka na dokończenie; potem sprzątanie usuwa go razem z plikami. */
export const LABEL_DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type LabelDraftPhoto = {
  id: string;
  path: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
};

export type LabelDraft = {
  id: string;
  photos: LabelDraftPhoto[];
  /** Ostatni wynik odczytu labelu, żeby po powrocie kreator otworzył się na właściwym kroku. */
  result: unknown;
  createdAt: Date;
};

/**
 * Szkic z kreatora to grupa zdjęć labelu w `pending_uploads` ze wspólnym `draft_id`.
 * Zdjęcia zabiera `PendingUploadRepository.claim` przy zapisie płyty, więc szkic znika razem z nimi.
 */
export interface LabelDraftRepository {
  /** Szkice od najnowszego; z `id` tylko ten jeden. */
  list(client: PoolClient, id?: string): Promise<LabelDraft[]>;

  /** Blokuje szkic do końca transakcji (także taki, którego jeszcze nie ma) i zwraca jego zdjęcia. */
  lock(client: PoolClient, id: string): Promise<LabelDraftPhoto[]>;

  deletePhotos(client: PoolClient, id: string): Promise<void>;

  addPhoto(
    client: PoolClient,
    data: LabelDraftPhoto & { draftId: string; position: number; createdBy: number | null },
  ): Promise<void>;

  saveResult(client: PoolClient, firstPhotoId: string, result: unknown): Promise<void>;

  /** Usuwa szkice, których najnowsze zdjęcie jest starsze niż `olderThan`, i zwraca zdjęcia do skasowania. */
  deleteAbandoned(client: PoolClient, olderThan: Date): Promise<LabelDraftPhoto[]>;
}
