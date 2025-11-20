-- Drop and recreate the game_history view with security_barrier to enforce RLS
DROP VIEW IF EXISTS game_history;

CREATE VIEW game_history 
WITH (security_barrier = true)
AS
SELECT 
  g.id,
  g.white_player_id,
  g.black_player_id,
  g.winner_id,
  g.result,
  g.status,
  g.completed_at,
  g.created_at,
  g.time_control,
  g.time_increment,
  g.pgn,
  g.move_count,
  wp.username AS white_player_username,
  wp.rating AS white_player_rating,
  bp.username AS black_player_username,
  bp.rating AS black_player_rating
FROM games g
LEFT JOIN profiles wp ON g.white_player_id = wp.id
LEFT JOIN profiles bp ON g.black_player_id = bp.id
WHERE g.status = 'completed';