-- A group of label photos saved by the panel is a durable wizard draft.
ALTER TABLE pending_uploads
  ADD COLUMN draft_id UUID,
  ADD COLUMN position SMALLINT,
  ADD CONSTRAINT label_draft_position UNIQUE (draft_id, position);
ALTER TABLE pending_uploads ADD COLUMN lookup_result JSONB;
