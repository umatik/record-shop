-- The wizard saves a draft only when it reaches the record details, so a draft keeps the wizard state
-- (reading, candidates, details), not only the last label lookup. `draft_saved_at` is the last save,
-- which decides when an abandoned draft is cleaned up.
ALTER TABLE pending_uploads RENAME COLUMN lookup_result TO wizard_state;
ALTER TABLE pending_uploads ADD COLUMN draft_saved_at TIMESTAMPTZ;
UPDATE pending_uploads SET draft_saved_at = created_at WHERE draft_id IS NOT NULL;
