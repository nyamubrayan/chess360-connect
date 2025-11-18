-- Create matchmaking queue table
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  time_control INTEGER NOT NULL,
  time_increment INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Policies for matchmaking_queue
CREATE POLICY "Users can view queue entries"
  ON matchmaking_queue FOR SELECT
  USING (true);

CREATE POLICY "Users can join queue"
  ON matchmaking_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave queue"
  ON matchmaking_queue FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for matchmaking
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_queue;