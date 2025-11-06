-- Add time control fields to rooms table
ALTER TABLE rooms
ADD COLUMN time_control INTEGER DEFAULT 10,
ADD COLUMN time_increment INTEGER DEFAULT 0,
ADD COLUMN white_player_id UUID REFERENCES profiles(id),
ADD COLUMN black_player_id UUID REFERENCES profiles(id),
ADD COLUMN white_time_remaining INTEGER,
ADD COLUMN black_time_remaining INTEGER,
ADD COLUMN last_move_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN game_status TEXT DEFAULT 'waiting' CHECK (game_status IN ('waiting', 'active', 'completed', 'aborted'));

-- Update existing rooms to have time control
UPDATE rooms SET white_time_remaining = time_control * 60, black_time_remaining = time_control * 60;