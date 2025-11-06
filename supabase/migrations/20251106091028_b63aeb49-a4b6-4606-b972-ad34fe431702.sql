-- Create game_history table to track completed games
CREATE TABLE game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  white_player_id UUID REFERENCES profiles(id),
  black_player_id UUID REFERENCES profiles(id),
  winner_id UUID REFERENCES profiles(id),
  result TEXT CHECK (result IN ('white_win', 'black_win', 'draw', 'timeout', 'resignation')),
  moves_pgn TEXT NOT NULL,
  total_moves INTEGER NOT NULL DEFAULT 0,
  time_control INTEGER NOT NULL,
  game_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create player_stats table for aggregated statistics
CREATE TABLE player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) UNIQUE NOT NULL,
  total_games INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  avg_game_duration INTEGER DEFAULT 0,
  favorite_opening TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create game_analysis table for AI-generated insights
CREATE TABLE game_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES game_history(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,
  key_moments JSONB DEFAULT '[]'::jsonb,
  overall_rating TEXT,
  suggestions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_history
CREATE POLICY "Users can view their own game history"
  ON game_history FOR SELECT
  USING (auth.uid() = white_player_id OR auth.uid() = black_player_id);

CREATE POLICY "System can insert game history"
  ON game_history FOR INSERT
  WITH CHECK (true);

-- RLS Policies for player_stats
CREATE POLICY "Users can view all player stats"
  ON player_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can update own stats"
  ON player_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON player_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for game_analysis
CREATE POLICY "Users can view their own game analysis"
  ON game_analysis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game analysis"
  ON game_analysis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update player stats
CREATE OR REPLACE FUNCTION update_player_stats(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO player_stats (user_id, total_games, wins, losses, draws, win_rate, updated_at)
  SELECT 
    p_user_id,
    COUNT(*),
    COUNT(*) FILTER (WHERE winner_id = p_user_id),
    COUNT(*) FILTER (WHERE (winner_id != p_user_id AND winner_id IS NOT NULL)),
    COUNT(*) FILTER (WHERE result = 'draw'),
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE winner_id = p_user_id)::NUMERIC / COUNT(*)) * 100, 1)
      ELSE 0
    END,
    NOW()
  FROM game_history
  WHERE white_player_id = p_user_id OR black_player_id = p_user_id
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_games = EXCLUDED.total_games,
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    draws = EXCLUDED.draws,
    win_rate = EXCLUDED.win_rate,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;