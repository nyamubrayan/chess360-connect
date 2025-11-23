-- Allow public viewing of user training stats for leaderboard
DROP POLICY IF EXISTS "Users can view own stats" ON user_training_stats;

CREATE POLICY "Public can view training stats for leaderboard"
ON user_training_stats
FOR SELECT
USING (true);

-- Ensure player_stats remains publicly viewable
DROP POLICY IF EXISTS "Users can view all player stats" ON player_stats;

CREATE POLICY "Public can view all player stats"
ON player_stats
FOR SELECT
USING (true);