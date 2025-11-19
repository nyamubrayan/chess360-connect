-- Add rating change fields to games table
ALTER TABLE games
ADD COLUMN white_rating_change integer DEFAULT 0,
ADD COLUMN black_rating_change integer DEFAULT 0;