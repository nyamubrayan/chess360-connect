-- Create game chat messages table
CREATE TABLE IF NOT EXISTS public.game_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_chat_messages ENABLE ROW LEVEL SECURITY;

-- Players can view messages in their games
CREATE POLICY "Players can view messages in their games"
ON public.game_chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = game_chat_messages.game_id
    AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
  )
);

-- Players can send messages in their games
CREATE POLICY "Players can send messages in their games"
ON public.game_chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = game_chat_messages.game_id
    AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
    AND games.status = 'active'
  )
);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_chat_messages;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_chat_messages_game_id ON public.game_chat_messages(game_id);
CREATE INDEX IF NOT EXISTS idx_game_chat_messages_created_at ON public.game_chat_messages(created_at);