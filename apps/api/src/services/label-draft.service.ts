import { randomUUID } from "node:crypto";
import type { Database } from "@/database/database.interface.js";
import type { Storage } from "@/storage/storage.interface.js";
import type { LabelImage } from "@/integrations/claude/label-reader.js";
import { PhotoLookupError } from "@/errors/external-service.error.js";
import { LabelDraftConflictError, LabelDraftNotFoundError } from "@/errors/label-draft.error.js";
import {
  LABEL_DRAFT_TTL_MS,
  type LabelDraft,
  type LabelDraftPhoto,
  type LabelDraftRepository,
} from "@/repositories/label-draft/label-draft.interface.js";
import type { RecordLookupService } from "@/services/record-lookup.service.js";

const EXTENSION_BY_MEDIA_TYPE: Record<LabelImage["mediaType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Trwałe szkice kreatora: zdjęcia labelu zapisane od razu po zrobieniu, z ostatnim wynikiem odczytu,
 * żeby można było wrócić do płyty później. Zdjęcia zabiera zapis płyty w tej samej transakcji, która ją tworzy.
 */
export class LabelDraftService {
  constructor(
    private readonly drafts: LabelDraftRepository,
    private readonly storage: Storage,
    private readonly pool: Database,
    private readonly recordLookup: Pick<RecordLookupService, "readLabelPhotos">,
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
   * Zastępuje zdjęcia szkicu nowymi; pusta lista usuwa szkic. `previous` to identyfikatory zdjęć,
   * które widział panel: inne oznaczają zmianę w innej karcie i kończą się 409.
   */
  async replace(id: string, previous: string[], images: LabelImage[], userId: number | null) {
    const client = await this.pool.connect();
    const saved: LabelDraftPhoto[] = [];
    let removed: LabelDraftPhoto[];

    try {
      await client.query("BEGIN");
      const abandoned = await this.drafts.deleteAbandoned(
        client,
        new Date(Date.now() - LABEL_DRAFT_TTL_MS),
      );
      const current = await this.drafts.lock(client, id);

      if (!sameIds(previous, current)) {
        throw new LabelDraftConflictError();
      }

      removed = [...abandoned, ...current];
      await this.drafts.deletePhotos(client, id);

      for (const [position, image] of images.entries()) {
        const photoId = randomUUID();
        const path = await this.storage.save(
          image.data,
          `products/photo/label-${photoId}.${EXTENSION_BY_MEDIA_TYPE[image.mediaType]}`,
          image.mediaType,
        );
        const photo = { id: photoId, path, contentType: image.mediaType };

        saved.push(photo);
        await this.drafts.addPhoto(client, { ...photo, draftId: id, position, createdBy: userId });
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      await this.deleteFiles(saved);
      throw error;
    } finally {
      client.release();
    }

    // Pliki kasujemy dopiero po zatwierdzeniu, żeby wycofana transakcja nie zostawiła wierszy bez plików.
    await this.deleteFiles(removed);

    return { id, photos: saved, result: null };
  }

  /** Odczytuje label ze zdjęć szkicu i zapamiętuje wynik; awaria integracji daje wynik `failed`, nie błąd. */
  async read(id: string, previous: string[]) {
    const draft = await this.get(id);
    const ids = draft.photos.map((photo) => photo.id);

    if (!sameIds(previous, draft.photos)) {
      throw new LabelDraftConflictError();
    }

    const images = await Promise.all(
      draft.photos.map(async (photo) => ({
        data: await this.storage.read(photo.path),
        mediaType: photo.contentType,
      })),
    );

    let result;

    try {
      result = {
        kind: "found" as const,
        ...(await this.recordLookup.readLabelPhotos(images, ids)),
      };
    } catch (error) {
      if (!(error instanceof PhotoLookupError)) {
        throw error;
      }

      result = {
        kind: "failed" as const,
        reading: null,
        message: error.message,
        photoUploadIds: ids,
      };
    }

    const client = await this.pool.connect();

    try {
      await this.drafts.saveResult(client, ids[0]!, result);
    } finally {
      client.release();
    }

    return result;
  }

  private async deleteFiles(photos: LabelDraftPhoto[]) {
    for (const { path } of photos) {
      await this.storage.delete(path).catch((error: unknown) => {
        console.error(`Failed to delete draft photo "${path}":`, error);
      });
    }
  }
}

const sameIds = (ids: string[], photos: LabelDraftPhoto[]) =>
  ids.length === photos.length && ids.every((id, index) => id === photos[index]?.id);
