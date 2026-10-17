-- 1. Create the single shared_snapshots table if not already created
CREATE TABLE IF NOT EXISTS shared_snapshots (
  id TEXT PRIMARY KEY,
  short_code TEXT UNIQUE,
  title TEXT,
  data JSONB NOT NULL,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index for instant lookup by short_code
CREATE INDEX IF NOT EXISTS idx_snapshots_short_code ON shared_snapshots(short_code);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE shared_snapshots ENABLE ROW LEVEL SECURITY;

-- 4. Grant table access to Supabase API roles
GRANT ALL ON TABLE public.shared_snapshots TO anon, authenticated, service_role;

-- 5. Set up RLS Policies (Safely drops existing policy first to avoid 42710 already exists error)

-- SELECT: Allow anyone worldwide to view a shared snapshot
DROP POLICY IF EXISTS "Public snapshots are viewable by everyone" ON shared_snapshots;
CREATE POLICY "Public snapshots are viewable by everyone"
  ON shared_snapshots FOR SELECT
  USING (true);

-- INSERT: Allow users to insert new share snapshots
DROP POLICY IF EXISTS "Anyone can create a shared snapshot" ON shared_snapshots;
CREATE POLICY "Anyone can create a shared snapshot"
  ON shared_snapshots FOR INSERT
  WITH CHECK (true);

-- UPDATE: Allow view count increments
DROP POLICY IF EXISTS "Anyone can increment view counts" ON shared_snapshots;
CREATE POLICY "Anyone can increment view counts"
  ON shared_snapshots FOR UPDATE
  USING (true);

-- DELETE: Allow deleting snapshots when disabled/deleted by author
DROP POLICY IF EXISTS "Allow snapshot deletion" ON shared_snapshots;
CREATE POLICY "Allow snapshot deletion"
  ON shared_snapshots FOR DELETE
  USING (true);
