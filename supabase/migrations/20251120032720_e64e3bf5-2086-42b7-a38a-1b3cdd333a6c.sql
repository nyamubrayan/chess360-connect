-- Add geolocation fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Create index for geolocation queries
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(latitude, longitude) WHERE location_enabled = true;

-- Create local_events table for meetups and tournaments
CREATE TABLE IF NOT EXISTS public.local_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('meetup', 'tournament', 'casual_play', 'training')),
  event_date TIMESTAMPTZ NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  location_name TEXT,
  city TEXT,
  country TEXT,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on local_events
ALTER TABLE public.local_events ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view upcoming events
CREATE POLICY "Anyone can view upcoming local events"
ON public.local_events
FOR SELECT
USING (true);

-- Policy: Authenticated users can create events
CREATE POLICY "Authenticated users can create local events"
ON public.local_events
FOR INSERT
WITH CHECK (auth.uid() = organizer_id);

-- Policy: Organizers can update their own events
CREATE POLICY "Organizers can update their own events"
ON public.local_events
FOR UPDATE
USING (auth.uid() = organizer_id);

-- Policy: Organizers can delete their own events
CREATE POLICY "Organizers can delete their own events"
ON public.local_events
FOR DELETE
USING (auth.uid() = organizer_id);

-- Create event_participants table
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.local_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  UNIQUE(event_id, user_id)
);

-- Enable RLS on event_participants
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view event participants
CREATE POLICY "Anyone can view event participants"
ON public.event_participants
FOR SELECT
USING (true);

-- Policy: Authenticated users can join events
CREATE POLICY "Authenticated users can join events"
ON public.event_participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own participation
CREATE POLICY "Users can update their own participation"
ON public.event_participants
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own participation
CREATE POLICY "Users can delete their own participation"
ON public.event_participants
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  R DECIMAL := 6371; -- Earth's radius in kilometers
  dLat DECIMAL;
  dLon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dLat := RADIANS(lat2 - lat1);
  dLon := RADIANS(lon2 - lon1);
  
  a := SIN(dLat/2) * SIN(dLat/2) + 
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * 
       SIN(dLon/2) * SIN(dLon/2);
  
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add trigger to update local_events updated_at
CREATE TRIGGER update_local_events_updated_at
BEFORE UPDATE ON public.local_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();