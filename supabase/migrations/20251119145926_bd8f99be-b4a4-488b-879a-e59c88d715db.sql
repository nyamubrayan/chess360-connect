-- Create function to update player stats automatically after game completion
CREATE OR REPLACE FUNCTION update_player_stats_after_game()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update stats when a game is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update stats for white player
    INSERT INTO player_stats (user_id, total_games, wins, losses, draws, win_rate, updated_at)
    SELECT 
      NEW.white_player_id,
      COUNT(*),
      COUNT(*) FILTER (WHERE winner_id = NEW.white_player_id),
      COUNT(*) FILTER (WHERE winner_id IS NOT NULL AND winner_id != NEW.white_player_id),
      COUNT(*) FILTER (WHERE winner_id IS NULL),
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE winner_id = NEW.white_player_id)::NUMERIC / COUNT(*)) * 100, 1)
        ELSE 0
      END,
      NOW()
    FROM games
    WHERE (white_player_id = NEW.white_player_id OR black_player_id = NEW.white_player_id)
      AND status = 'completed'
    ON CONFLICT (user_id) 
    DO UPDATE SET
      total_games = EXCLUDED.total_games,
      wins = EXCLUDED.wins,
      losses = EXCLUDED.losses,
      draws = EXCLUDED.draws,
      win_rate = EXCLUDED.win_rate,
      updated_at = NOW();

    -- Update stats for black player
    INSERT INTO player_stats (user_id, total_games, wins, losses, draws, win_rate, updated_at)
    SELECT 
      NEW.black_player_id,
      COUNT(*),
      COUNT(*) FILTER (WHERE winner_id = NEW.black_player_id),
      COUNT(*) FILTER (WHERE winner_id IS NOT NULL AND winner_id != NEW.black_player_id),
      COUNT(*) FILTER (WHERE winner_id IS NULL),
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE winner_id = NEW.black_player_id)::NUMERIC / COUNT(*)) * 100, 1)
        ELSE 0
      END,
      NOW()
    FROM games
    WHERE (white_player_id = NEW.black_player_id OR black_player_id = NEW.black_player_id)
      AND status = 'completed'
    ON CONFLICT (user_id) 
    DO UPDATE SET
      total_games = EXCLUDED.total_games,
      wins = EXCLUDED.wins,
      losses = EXCLUDED.losses,
      draws = EXCLUDED.draws,
      win_rate = EXCLUDED.win_rate,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to automatically update player stats
DROP TRIGGER IF EXISTS trigger_update_player_stats ON games;
CREATE TRIGGER trigger_update_player_stats
  AFTER INSERT OR UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats_after_game();