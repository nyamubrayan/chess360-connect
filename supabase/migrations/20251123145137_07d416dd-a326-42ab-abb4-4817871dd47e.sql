-- Create table for starred lesson sections
CREATE TABLE IF NOT EXISTS lesson_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_title TEXT NOT NULL,
  lesson_category TEXT NOT NULL,
  section_title TEXT NOT NULL,
  section_content TEXT NOT NULL,
  section_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_title, section_index)
);

-- Enable RLS
ALTER TABLE lesson_bookmarks ENABLE ROW LEVEL SECURITY;

-- Policies for lesson bookmarks
CREATE POLICY "Users can view their own bookmarks"
  ON lesson_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
  ON lesson_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON lesson_bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_lesson_bookmarks_user_id ON lesson_bookmarks(user_id);
CREATE INDEX idx_lesson_bookmarks_created_at ON lesson_bookmarks(created_at DESC);