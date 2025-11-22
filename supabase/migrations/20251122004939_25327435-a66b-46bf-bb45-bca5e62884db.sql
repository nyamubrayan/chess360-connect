-- Add training stats visibility control to profiles
ALTER TABLE profiles ADD COLUMN show_training_stats BOOLEAN DEFAULT false;

COMMENT ON COLUMN profiles.show_training_stats IS 'Whether to display training stats publicly in Networking Zone';
