-- ── Counter offers on job applications ──────────────────────────────────────
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS counter_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS counter_note  TEXT;

-- ── Messages / Chat ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id            UUID REFERENCES jobs(id) ON DELETE SET NULL,
  freelancer_job_id UUID REFERENCES freelancer_jobs(id) ON DELETE SET NULL,
  content           TEXT NOT NULL,
  read              BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_sender_idx    ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_recipient_idx ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS messages_job_idx       ON messages(job_id);
CREATE INDEX IF NOT EXISTS messages_created_idx   ON messages(created_at);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    (SELECT auth.uid()) = sender_id OR
    (SELECT auth.uid()) = recipient_id
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = sender_id);

CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING ((SELECT auth.uid()) = recipient_id);

-- Enable realtime (safe: only adds if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
