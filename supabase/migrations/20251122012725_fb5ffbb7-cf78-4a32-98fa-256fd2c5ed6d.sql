-- Create training sessions table for collaborative AI Coach training
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  current_fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  move_count INTEGER NOT NULL DEFAULT 0,
  last_move TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for training sessions
CREATE POLICY "Users can view their own training sessions"
  ON public.training_sessions
  FOR SELECT
  USING (auth.uid() = host_player_id OR auth.uid() = guest_player_id);

CREATE POLICY "Users can create training sessions"
  ON public.training_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = host_player_id);

CREATE POLICY "Participants can update their training sessions"
  ON public.training_sessions
  FOR UPDATE
  USING (auth.uid() = host_player_id OR auth.uid() = guest_player_id);

CREATE POLICY "Host can delete training sessions"
  ON public.training_sessions
  FOR DELETE
  USING (auth.uid() = host_player_id);

-- Add updated_at trigger
CREATE TRIGGER update_training_sessions_updated_at
  BEFORE UPDATE ON public.training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_sessions;