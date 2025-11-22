-- Add training mode to matchmaking queue
ALTER TABLE matchmaking_queue
ADD COLUMN IF NOT EXISTS mode text DEFAULT 'game' CHECK (mode IN ('game', 'training'));