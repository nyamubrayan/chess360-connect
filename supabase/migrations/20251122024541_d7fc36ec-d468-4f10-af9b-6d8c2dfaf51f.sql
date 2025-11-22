-- Create news_articles table
CREATE TABLE public.news_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category TEXT DEFAULT 'general',
  image_url TEXT,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_participants INTEGER,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create event_participants table
CREATE TABLE public.event_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for news_articles
CREATE POLICY "News articles are viewable by everyone" 
ON public.news_articles FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create news articles" 
ON public.news_articles FOR INSERT 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own news articles" 
ON public.news_articles FOR UPDATE 
USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own news articles" 
ON public.news_articles FOR DELETE 
USING (auth.uid() = author_id);

-- RLS Policies for events
CREATE POLICY "Events are viewable by everyone" 
ON public.events FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create events" 
ON public.events FOR INSERT 
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their own events" 
ON public.events FOR UPDATE 
USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their own events" 
ON public.events FOR DELETE 
USING (auth.uid() = organizer_id);

-- RLS Policies for event_participants
CREATE POLICY "Event participants are viewable by everyone" 
ON public.event_participants FOR SELECT 
USING (true);

CREATE POLICY "Users can join events" 
ON public.event_participants FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave events they joined" 
ON public.event_participants FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_news_articles_published_at ON public.news_articles(published_at DESC);
CREATE INDEX idx_news_articles_category ON public.news_articles(category);
CREATE INDEX idx_events_event_date ON public.events(event_date);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX idx_event_participants_user_id ON public.event_participants(user_id);

-- Trigger for updating updated_at
CREATE TRIGGER update_news_articles_updated_at
BEFORE UPDATE ON public.news_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();