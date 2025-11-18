-- Create games table for storing chess games
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_player_id UUID NOT NULL REFERENCES profiles(id),
  black_player_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')),
  result TEXT CHECK (result IN ('white_won', 'black_won', 'draw', 'stalemate', 'timeout', 'resignation', 'abandoned')),
  winner_id UUID REFERENCES profiles(id),
  current_fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn TEXT DEFAULT '',
  current_turn TEXT NOT NULL DEFAULT 'w' CHECK (current_turn IN ('w', 'b')),
  time_control INTEGER NOT NULL DEFAULT 600, -- seconds per player
  time_increment INTEGER NOT NULL DEFAULT 0, -- seconds added per move
  white_time_remaining INTEGER NOT NULL,
  black_time_remaining INTEGER NOT NULL,
  last_move_at TIMESTAMP WITH TIME ZONE,
  move_count INTEGER NOT NULL DEFAULT 0,
  fifty_move_counter INTEGER NOT NULL DEFAULT 0,
  position_history JSONB DEFAULT '[]'::jsonb, -- for threefold repetition
  draw_offered_by UUID REFERENCES profiles(id),
  undo_requested_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create game_moves table for move history
CREATE TABLE public.game_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  player_id UUID NOT NULL REFERENCES profiles(id),
  move_san TEXT NOT NULL, -- Standard Algebraic Notation
  move_uci TEXT NOT NULL, -- UCI format (e.g., e2e4)
  fen_before TEXT NOT NULL,
  fen_after TEXT NOT NULL,
  time_spent INTEGER, -- milliseconds
  time_remaining INTEGER, -- milliseconds
  is_check BOOLEAN DEFAULT false,
  is_checkmate BOOLEAN DEFAULT false,
  is_capture BOOLEAN DEFAULT false,
  is_castling BOOLEAN DEFAULT false,
  is_en_passant BOOLEAN DEFAULT false,
  promotion_piece TEXT CHECK (promotion_piece IN ('q', 'r', 'b', 'n')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_games_white_player ON games(white_player_id);
CREATE INDEX idx_games_black_player ON games(black_player_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX idx_game_moves_created_at ON game_moves(created_at);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- RLS Policies for games
CREATE POLICY "Players can view their games"
  ON games FOR SELECT
  USING (auth.uid() = white_player_id OR auth.uid() = black_player_id);

CREATE POLICY "Authenticated users can create games"
  ON games FOR INSERT
  WITH CHECK (auth.uid() = white_player_id);

CREATE POLICY "Players can update their games"
  ON games FOR UPDATE
  USING (auth.uid() = white_player_id OR auth.uid() = black_player_id);

-- RLS Policies for game_moves
CREATE POLICY "Players can view moves in their games"
  ON game_moves FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_moves.game_id
      AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
    )
  );

CREATE POLICY "System can insert moves"
  ON game_moves FOR INSERT
  WITH CHECK (true);

-- Enable realtime for games table
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- Trigger to update updated_at
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();