-- Create chess clock sessions table for multi-device synchronization
CREATE TABLE IF NOT EXISTS public.chess_clock_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_code TEXT UNIQUE NOT NULL,
  host_player_side TEXT NOT NULL CHECK (host_player_side IN ('white', 'black')),
  time_control INTEGER NOT NULL,
  time_increment INTEGER NOT NULL,
  white_time INTEGER NOT NULL,
  black_time INTEGER NOT NULL,
  is_white_turn BOOLEAN DEFAULT TRUE,
  white_moves INTEGER DEFAULT 0,
  black_moves INTEGER DEFAULT 0,
  move_timings JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  is_paused BOOLEAN DEFAULT FALSE,
  game_result TEXT,
  last_move_at TIMESTAMPTZ,
  guest_connected BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE public.chess_clock_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active sessions (needed for code entry)
CREATE POLICY "Anyone can read active sessions"
  ON public.chess_clock_sessions
  FOR SELECT
  USING (true);

-- Allow anyone to create sessions
CREATE POLICY "Anyone can create sessions"
  ON public.chess_clock_sessions
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update sessions they have access to
CREATE POLICY "Anyone can update sessions"
  ON public.chess_clock_sessions
  FOR UPDATE
  USING (true);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chess_clock_sessions;

-- Create index for faster code lookups
CREATE INDEX idx_chess_clock_sessions_code ON public.chess_clock_sessions(session_code);
CREATE INDEX idx_chess_clock_sessions_active ON public.chess_clock_sessions(is_active);