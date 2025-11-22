-- Allow public viewing of completed games for shared analysis
CREATE POLICY "Public viewing of completed games"
ON games
FOR SELECT
USING (status = 'completed');

-- Allow public viewing of game moves for shared analysis
CREATE POLICY "Public viewing of game moves"
ON game_moves
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_moves.game_id
    AND games.status = 'completed'
  )
);