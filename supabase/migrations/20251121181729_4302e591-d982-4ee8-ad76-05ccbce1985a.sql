-- Drop community-related tables and their dependencies
-- Order matters due to foreign key constraints

-- Drop study room related tables
DROP TABLE IF EXISTS study_room_messages CASCADE;
DROP TABLE IF EXISTS study_room_participants CASCADE;
DROP TABLE IF EXISTS study_rooms CASCADE;

-- Drop tournament related tables
DROP TABLE IF EXISTS tournament_participants CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;

-- Drop lesson related tables
DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;

-- Drop coach profiles
DROP TABLE IF EXISTS coach_profiles CASCADE;

-- Drop post related tables
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

-- Drop event related tables
DROP TABLE IF EXISTS event_participants CASCADE;
DROP TABLE IF EXISTS local_events CASCADE;

-- Drop leaderboard_stats (contains community metrics)
DROP TABLE IF EXISTS leaderboard_stats CASCADE;

-- Remove coach role from app_role enum (if not used elsewhere)
-- Note: This requires recreating the enum, which is complex, so we'll leave the enum as is