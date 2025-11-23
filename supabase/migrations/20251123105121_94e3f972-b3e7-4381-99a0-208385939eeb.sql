-- Add separate rating columns for each game type
ALTER TABLE public.profiles 
ADD COLUMN bullet_rating integer DEFAULT 1200,
ADD COLUMN blitz_rating integer DEFAULT 1200,
ADD COLUMN rapid_rating integer DEFAULT 1200,
ADD COLUMN bullet_games_played integer DEFAULT 0,
ADD COLUMN blitz_games_played integer DEFAULT 0,
ADD COLUMN rapid_games_played integer DEFAULT 0;

-- Create a function to categorize game type based on time control
CREATE OR REPLACE FUNCTION public.get_game_category(p_time_control integer, p_time_increment integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Bullet: < 3 minutes total
  IF p_time_control < 3 THEN
    RETURN 'bullet';
  -- Blitz: 3-10 minutes
  ELSIF p_time_control < 10 THEN
    RETURN 'blitz';
  -- Rapid: 10+ minutes
  ELSE
    RETURN 'rapid';
  END IF;
END;
$$;

-- Create function to update category-specific ratings after game completion
CREATE OR REPLACE FUNCTION public.update_category_ratings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_category text;
BEGIN
  -- Only process completed games
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Determine game category
    v_category := get_game_category(NEW.time_control, NEW.time_increment);
    
    -- Update white player's category rating and games played
    IF v_category = 'bullet' THEN
      UPDATE profiles 
      SET 
        bullet_rating = GREATEST(bullet_rating + COALESCE(NEW.white_rating_change, 0), 0),
        bullet_games_played = bullet_games_played + 1
      WHERE id = NEW.white_player_id;
    ELSIF v_category = 'blitz' THEN
      UPDATE profiles 
      SET 
        blitz_rating = GREATEST(blitz_rating + COALESCE(NEW.white_rating_change, 0), 0),
        blitz_games_played = blitz_games_played + 1
      WHERE id = NEW.white_player_id;
    ELSE
      UPDATE profiles 
      SET 
        rapid_rating = GREATEST(rapid_rating + COALESCE(NEW.white_rating_change, 0), 0),
        rapid_games_played = rapid_games_played + 1
      WHERE id = NEW.white_player_id;
    END IF;
    
    -- Update black player's category rating and games played
    IF v_category = 'bullet' THEN
      UPDATE profiles 
      SET 
        bullet_rating = GREATEST(bullet_rating + COALESCE(NEW.black_rating_change, 0), 0),
        bullet_games_played = bullet_games_played + 1
      WHERE id = NEW.black_player_id;
    ELSIF v_category = 'blitz' THEN
      UPDATE profiles 
      SET 
        blitz_rating = GREATEST(blitz_rating + COALESCE(NEW.black_rating_change, 0), 0),
        blitz_games_played = blitz_games_played + 1
      WHERE id = NEW.black_player_id;
    ELSE
      UPDATE profiles 
      SET 
        rapid_rating = GREATEST(rapid_rating + COALESCE(NEW.black_rating_change, 0), 0),
        rapid_games_played = rapid_games_played + 1
      WHERE id = NEW.black_player_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update category ratings
DROP TRIGGER IF EXISTS update_category_ratings_trigger ON games;
CREATE TRIGGER update_category_ratings_trigger
  AFTER INSERT OR UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_category_ratings();