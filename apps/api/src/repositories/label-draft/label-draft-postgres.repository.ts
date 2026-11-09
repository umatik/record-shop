import type { PoolClient } from "pg";
import type {
  LabelDraft,
  LabelDraftPhoto,
  LabelDraftRepository,
} from "./label-draft.interface.js";

const PHOTO_COLUMNS = `id, path, content_type AS "contentType"`;

export class LabelDraftPostgresRepository implements LabelDraftRepository {
  async list(client: PoolClient, id?: string): Promise<LabelDraft[]> {
    const result = await client.query<LabelDraft>(
      `
        SELECT draft_id AS id,
               min(created_at) AS "createdAt",
               (jsonb_agg(lookup_result ORDER BY position))->0 AS result,
               jsonb_agg(
                 jsonb_build_object('id', id, 'path', path, 'contentType', content_type)
                 ORDER BY position
               ) AS photos
        FROM pending_uploads
        WHERE draft_id IS NOT NULL AND ($1::uuid IS NULL OR draft_id = $1)
        GROUP BY draft_id
        ORDER BY min(created_at) DESC
      `,
      [id ?? null],
    );

    return result.rows;
  }

  async lock(client: PoolClient, id: string): Promise<LabelDraftPhoto[]> {
    // Blokada doradcza działa także dla nowego szkicu, którego wierszy jeszcze nie ma.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [id]);
    const result = await client.query<LabelDraftPhoto>(
      `
        SELECT ${PHOTO_COLUMNS}
        FROM pending_uploads
        WHERE draft_id = $1
        ORDER BY position
        FOR UPDATE
      `,
      [id],
    );

    return result.rows;
  }

  async deletePhotos(client: PoolClient, id: string): Promise<void> {
    await client.query("DELETE FROM pending_uploads WHERE draft_id = $1", [id]);
  }

  async addPhoto(
    client: PoolClient,
    data: LabelDraftPhoto & { draftId: string; position: number; createdBy: number | null },
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO pending_uploads (id, path, content_type, created_by, draft_id, position)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [data.id, data.path, data.contentType, data.createdBy, data.draftId, data.position],
    );
  }

  async saveResult(client: PoolClient, firstPhotoId: string, result: unknown): Promise<void> {
    await client.query(
      "UPDATE pending_uploads SET lookup_result = $2 WHERE id = $1 AND draft_id IS NOT NULL",
      [firstPhotoId, JSON.stringify(result)],
    );
  }

  async deleteAbandoned(client: PoolClient, olderThan: Date): Promise<LabelDraftPhoto[]> {
    const result = await client.query<LabelDraftPhoto>(
      `
        DELETE FROM pending_uploads
        WHERE draft_id IN (
          SELECT draft_id
          FROM pending_uploads
          WHERE draft_id IS NOT NULL
          GROUP BY draft_id
          HAVING max(created_at) < $1
        )
        RETURNING ${PHOTO_COLUMNS}
      `,
      [olderThan],
    );

    return result.rows;
  }
}
