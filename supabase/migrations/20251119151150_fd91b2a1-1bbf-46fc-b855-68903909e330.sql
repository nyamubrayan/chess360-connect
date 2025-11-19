-- Create table for game highlights
CREATE TABLE IF NOT EXISTS game_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  key_moments JSONB NOT NULL,
  duration INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  UNIQUE(game_id, user_id)
);

-- Enable RLS
ALTER TABLE game_highlights ENABLE ROW LEVEL SECURITY;

-- Policies for game highlights
CREATE POLICY "Users can view all highlights"
  ON game_highlights FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own highlights"
  ON game_highlights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own highlights"
  ON game_highlights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own highlights"
  ON game_highlights FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_game_highlights_user_id ON game_highlights(user_id);
CREATE INDEX idx_game_highlights_game_id ON game_highlights(game_id);
CREATE INDEX idx_game_highlights_created_at ON game_highlights(created_at DESC);