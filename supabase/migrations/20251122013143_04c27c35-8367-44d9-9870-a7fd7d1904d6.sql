-- Add tracking fields to training_sessions for history and metrics
ALTER TABLE training_sessions
ADD COLUMN completed_at timestamp with time zone,
ADD COLUMN duration integer, -- duration in seconds
ADD COLUMN host_move_accuracy numeric,
ADD COLUMN guest_move_accuracy numeric,
ADD COLUMN host_good_moves integer DEFAULT 0,
ADD COLUMN host_questionable_moves integer DEFAULT 0,
ADD COLUMN host_mistakes integer DEFAULT 0,
ADD COLUMN host_blunders integer DEFAULT 0,
ADD COLUMN guest_good_moves integer DEFAULT 0,
ADD COLUMN guest_questionable_moves integer DEFAULT 0,
ADD COLUMN guest_mistakes integer DEFAULT 0,
ADD COLUMN guest_blunders integer DEFAULT 0,
ADD COLUMN analysis_summary jsonb DEFAULT '[]'::jsonb;