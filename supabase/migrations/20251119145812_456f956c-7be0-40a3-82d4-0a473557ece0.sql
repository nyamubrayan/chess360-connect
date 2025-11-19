-- Create game_history view for easier access to completed games
CREATE OR REPLACE VIEW game_history AS
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
  wp.username as white_player_username,
  wp.rating as white_player_rating,
  bp.username as black_player_username,
  bp.rating as black_player_rating
FROM games g
LEFT JOIN profiles wp ON g.white_player_id = wp.id
LEFT JOIN profiles bp ON g.black_player_id = bp.id
WHERE g.status = 'completed';

-- Grant access to the view
GRANT SELECT ON game_history TO authenticated;