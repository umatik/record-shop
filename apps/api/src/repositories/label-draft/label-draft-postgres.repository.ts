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
               max(draft_saved_at) AS "createdAt",
               (jsonb_agg(wizard_state ORDER BY position))->0 AS state,
               jsonb_agg(
                 jsonb_build_object('id', id, 'path', path, 'contentType', content_type)
                 ORDER BY position
               ) AS photos
        FROM pending_uploads
        WHERE draft_id IS NOT NULL AND ($1::uuid IS NULL OR draft_id = $1)
        GROUP BY draft_id
        ORDER BY max(draft_saved_at) DESC
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

  async attachPending(
    client: PoolClient,
    id: string,
    photoIds: string[],
    maxAgeMs: number,
  ): Promise<string[]> {
    if (photoIds.length === 0) {
      return [];
    }

    const result = await client.query<{ id: string }>(
      `
        UPDATE pending_uploads
        SET draft_id = $1
        WHERE id = ANY ($2::uuid[])
          AND draft_id IS NULL
          AND created_at > NOW() - ($3::bigint * INTERVAL '1 millisecond')
        RETURNING id
      `,
      [id, photoIds, maxAgeMs],
    );

    return result.rows.map((row) => row.id);
  }

  async saveState(
    client: PoolClient,
    id: string,
    photoIds: string[],
    state: unknown,
  ): Promise<void> {
    // Najpierw zdejmujemy pozycje, żeby zamiana kolejności nie naruszyła UNIQUE (draft_id, position).
    await client.query(
      "UPDATE pending_uploads SET position = NULL, wizard_state = NULL WHERE draft_id = $1",
      [id],
    );
    await client.query(
      `
        UPDATE pending_uploads AS upload
        SET position = photo.position - 1,
            wizard_state = CASE WHEN photo.position = 1 THEN $3::jsonb END,
            draft_saved_at = NOW()
        FROM unnest($2::uuid[]) WITH ORDINALITY AS photo (id, position)
        WHERE upload.id = photo.id AND upload.draft_id = $1
      `,
      [id, photoIds, JSON.stringify(state)],
    );
  }

  async deletePhotos(client: PoolClient, id: string, photoIds: string[]): Promise<void> {
    await client.query("DELETE FROM pending_uploads WHERE draft_id = $1 AND id = ANY ($2::uuid[])", [
      id,
      photoIds,
    ]);
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
          HAVING max(draft_saved_at) < $1
        )
        RETURNING ${PHOTO_COLUMNS}
      `,
      [olderThan],
    );

    return result.rows;
  }
}
