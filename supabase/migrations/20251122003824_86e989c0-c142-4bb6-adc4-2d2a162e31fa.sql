-- Create training_achievements table for available achievements
CREATE TABLE IF NOT EXISTS public.training_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  requirement_type TEXT NOT NULL, -- 'puzzles_solved', 'lessons_completed', 'streak_days', 'perfect_score', etc.
  requirement_value INTEGER NOT NULL,
  points INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_training_progress table
CREATE TABLE IF NOT EXISTS public.user_training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_type TEXT NOT NULL, -- 'puzzle', 'opening', 'endgame', 'basic'
  training_id TEXT NOT NULL, -- identifier for specific lesson/puzzle
  completed BOOLEAN DEFAULT false,
  score INTEGER, -- percentage or points
  time_spent INTEGER, -- seconds
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, training_type, training_id)
);

-- Create user_streaks table
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  total_training_days INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_training_achievements table
CREATE TABLE IF NOT EXISTS public.user_training_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES training_achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Create user_training_stats table for overall stats
CREATE TABLE IF NOT EXISTS public.user_training_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_puzzles_solved INTEGER DEFAULT 0,
  total_lessons_completed INTEGER DEFAULT 0,
  total_perfect_scores INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  training_level INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_achievements
CREATE POLICY "Achievements viewable by everyone"
  ON public.training_achievements FOR SELECT
  USING (true);

-- RLS Policies for user_training_progress
CREATE POLICY "Users can view own progress"
  ON public.user_training_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.user_training_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.user_training_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_streaks
CREATE POLICY "Users can view own streaks"
  ON public.user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks"
  ON public.user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks"
  ON public.user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_training_achievements
CREATE POLICY "Users can view own achievements"
  ON public.user_training_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON public.user_training_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_training_stats
CREATE POLICY "Users can view own stats"
  ON public.user_training_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON public.user_training_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON public.user_training_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Insert initial achievements
INSERT INTO public.training_achievements (name, description, badge_icon, requirement_type, requirement_value, points) VALUES
  ('First Steps', 'Complete your first puzzle', '🎯', 'puzzles_solved', 1, 10),
  ('Puzzle Novice', 'Solve 10 puzzles', '🧩', 'puzzles_solved', 10, 25),
  ('Puzzle Adept', 'Solve 50 puzzles', '🎓', 'puzzles_solved', 50, 50),
  ('Puzzle Master', 'Solve 100 puzzles', '👑', 'puzzles_solved', 100, 100),
  ('Perfect Tactician', 'Get 10 perfect scores', '⭐', 'perfect_scores', 10, 50),
  ('Week Warrior', 'Maintain a 7-day streak', '🔥', 'streak_days', 7, 30),
  ('Month Champion', 'Maintain a 30-day streak', '🏆', 'streak_days', 30, 100),
  ('Lesson Learner', 'Complete 5 lessons', '📚', 'lessons_completed', 5, 20),
  ('Opening Expert', 'Complete all opening lessons', '♟️', 'openings_completed', 3, 40),
  ('Endgame Guru', 'Complete all endgame lessons', '♔', 'endgames_completed', 6, 60),
  ('Speed Demon', 'Solve a puzzle in under 10 seconds', '⚡', 'fast_solve', 1, 30),
  ('Training Veteran', 'Complete 100 training activities', '🎖️', 'total_activities', 100, 150);

-- Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get or create streak record
  INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date, total_training_days)
  VALUES (p_user_id, 0, 0, NULL, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM user_streaks
  WHERE user_id = p_user_id;

  -- Update streak logic
  IF v_last_activity IS NULL OR v_last_activity < v_today - INTERVAL '1 day' THEN
    -- Streak broken or first activity
    IF v_last_activity = v_today - INTERVAL '1 day' THEN
      -- Continue streak
      v_current_streak := v_current_streak + 1;
    ELSE
      -- Start new streak
      v_current_streak := 1;
    END IF;
  ELSIF v_last_activity = v_today THEN
    -- Already counted today, no change
    RETURN;
  END IF;

  -- Update longest streak if current is higher
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  UPDATE user_streaks
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_activity_date = v_today,
    total_training_days = total_training_days + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement RECORD;
  v_user_stats RECORD;
  v_streak_days INTEGER;
BEGIN
  -- Get user stats
  SELECT * INTO v_user_stats
  FROM user_training_stats
  WHERE user_id = p_user_id;

  -- Get streak
  SELECT current_streak INTO v_streak_days
  FROM user_streaks
  WHERE user_id = p_user_id;

  -- Check each achievement
  FOR v_achievement IN SELECT * FROM training_achievements LOOP
    -- Skip if already earned
    IF EXISTS (
      SELECT 1 FROM user_training_achievements
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) THEN
      CONTINUE;
    END IF;

    -- Check requirements
    IF (v_achievement.requirement_type = 'puzzles_solved' AND v_user_stats.total_puzzles_solved >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'lessons_completed' AND v_user_stats.total_lessons_completed >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'perfect_scores' AND v_user_stats.total_perfect_scores >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'streak_days' AND v_streak_days >= v_achievement.requirement_value) THEN
      
      -- Award achievement
      INSERT INTO user_training_achievements (user_id, achievement_id)
      VALUES (p_user_id, v_achievement.id);

      -- Add points
      UPDATE user_training_stats
      SET total_points = total_points + v_achievement.points
      WHERE user_id = p_user_id;
    END IF;
  END LOOP;
END;
$$;