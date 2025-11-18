-- Create lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  lesson_type TEXT NOT NULL CHECK (lesson_type IN ('video', 'guide', 'puzzle_set')),
  video_url TEXT,
  file_url TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'master')),
  tags TEXT[],
  is_published BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Published lessons viewable by everyone"
  ON public.lessons
  FOR SELECT
  USING (is_published = true OR auth.uid() = coach_id);

CREATE POLICY "Coaches can create lessons"
  ON public.lessons
  FOR INSERT
  WITH CHECK (
    auth.uid() = coach_id AND 
    has_role(auth.uid(), 'coach'::app_role)
  );

CREATE POLICY "Coaches can update own lessons"
  ON public.lessons
  FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete own lessons"
  ON public.lessons
  FOR DELETE
  USING (auth.uid() = coach_id);

-- Create storage bucket for lesson files
INSERT INTO storage.buckets (id, name, public)
VALUES ('lessons', 'lessons', true);

-- Storage policies for lesson files
CREATE POLICY "Lesson files publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'lessons');

CREATE POLICY "Coaches can upload lesson files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'lessons' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Coaches can update their lesson files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'lessons' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Coaches can delete their lesson files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'lessons' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger for updated_at
CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();