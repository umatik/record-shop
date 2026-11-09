import type { Database } from "@/database/database.interface.js";
import type { Storage } from "@/storage/storage.interface.js";
import {
  LabelDraftNotFoundError,
  LabelDraftPhotosUnavailableError,
} from "@/errors/label-draft.error.js";
import {
  LABEL_DRAFT_TTL_MS,
  type LabelDraft,
  type LabelDraftPhoto,
  type LabelDraftRepository,
} from "@/repositories/label-draft/label-draft.interface.js";
import { PENDING_UPLOAD_TTL_MS } from "@/repositories/pending-upload/pending-upload.interface.js";

/**
 * Trwałe szkice kreatora. Zdjęcia z odczytu labelu są oczekujące i same wygasają; dopiero gdy kreator
 * dojdzie do danych płyty, zapis szkicu zabiera je razem ze stanem kreatora, żeby można było wrócić później.
 * Zdjęcia szkicu zabiera zapis płyty w tej samej transakcji, która ją tworzy.
 */
export class LabelDraftService {
  constructor(
    private readonly drafts: LabelDraftRepository,
    private readonly storage: Storage,
    private readonly pool: Database,
  ) {}

  async list(): Promise<LabelDraft[]> {
    const client = await this.pool.connect();

    try {
      return await this.drafts.list(client);
    } finally {
      client.release();
    }
  }

  async get(id: string): Promise<LabelDraft> {
    const client = await this.pool.connect();

    try {
      const [draft] = await this.drafts.list(client, id);

      if (!draft) {
        throw new LabelDraftNotFoundError(id);
      }

      return draft;
    } finally {
      client.release();
    }
  }

  /**
   * Zapisuje szkic: `photoIds` to zdjęcia labelu w kolejności (już należące do szkicu albo oczekujące
   * z odczytu), `state` to stan kreatora. Zdjęcia szkicu, których kreator już nie używa, są usuwane.
   */
  async save(id: string, photoIds: string[], state: unknown): Promise<LabelDraft> {
    const client = await this.pool.connect();
    let removed: LabelDraftPhoto[];
    let draft: LabelDraft | undefined;

    try {
      await client.query("BEGIN");
      const abandoned = await this.drafts.deleteAbandoned(
        client,
        new Date(Date.now() - LABEL_DRAFT_TTL_MS),
      );
      const current = await this.drafts.lock(client, id);
      const currentIds = new Set(current.map((photo) => photo.id));
      const added = photoIds.filter((photoId) => !currentIds.has(photoId));
      const attached = await this.drafts.attachPending(client, id, added, PENDING_UPLOAD_TTL_MS);

      if (attached.length !== added.length) {
        throw new LabelDraftPhotosUnavailableError();
      }

      const unused = current.filter((photo) => !photoIds.includes(photo.id));

      if (unused.length > 0) {
        await this.drafts.deletePhotos(
          client,
          id,
          unused.map((photo) => photo.id),
        );
      }

      await this.drafts.saveState(client, id, photoIds, state);
      [draft] = await this.drafts.list(client, id);
      await client.query("COMMIT");
      removed = [...abandoned, ...unused];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    // Pliki kasujemy dopiero po zatwierdzeniu, żeby wycofana transakcja nie zostawiła wierszy bez plików.
    await this.deleteFiles(removed);

    if (!draft) {
      throw new LabelDraftNotFoundError(id);
    }

    return draft;
  }

  /** Usuwa szkic razem z plikami zdjęć (pliki dopiero po zatwierdzeniu transakcji). */
  async delete(id: string): Promise<void> {
    const client = await this.pool.connect();
    let photos: LabelDraftPhoto[];

    try {
      await client.query("BEGIN");
      photos = await this.drafts.lock(client, id);

      if (photos.length === 0) {
        throw new LabelDraftNotFoundError(id);
      }

      await this.drafts.deletePhotos(
        client,
        id,
        photos.map((photo) => photo.id),
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    await this.deleteFiles(photos);
  }

  private async deleteFiles(photos: LabelDraftPhoto[]) {
    for (const { path } of photos) {
      await this.storage.delete(path).catch((error: unknown) => {
        console.error(`Failed to delete draft photo "${path}":`, error);
      });
    }
  }
}
