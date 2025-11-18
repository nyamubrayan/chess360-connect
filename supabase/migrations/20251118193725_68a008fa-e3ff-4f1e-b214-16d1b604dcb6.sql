-- Allow authenticated users to create games as either white or black
ALTER POLICY "Authenticated users can create games"
ON public.games
WITH CHECK ((auth.uid() = white_player_id) OR (auth.uid() = black_player_id));