-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'coach', 'player');
CREATE TYPE public.room_type AS ENUM ('discussion', 'study');
CREATE TYPE public.tournament_status AS ENUM ('upcoming', 'active', 'completed', 'cancelled');
CREATE TYPE public.tournament_format AS ENUM ('standard', 'chess960', 'hand_and_brain', 'puzzle_battle');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  rating INTEGER DEFAULT 1200,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, role)
);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type room_type NOT NULL,
  creator_id UUID REFERENCES public.profiles(id) NOT NULL,
  current_fen TEXT DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  is_active BOOLEAN DEFAULT TRUE,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create room_members table
CREATE TABLE public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Create room_messages table
CREATE TABLE public.room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create room_annotations table for collaborative chessboard
CREATE TABLE public.room_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  fen TEXT NOT NULL,
  annotation TEXT,
  arrows JSONB DEFAULT '[]'::jsonb,
  highlights JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  format tournament_format NOT NULL DEFAULT 'standard',
  status tournament_status NOT NULL DEFAULT 'upcoming',
  organizer_id UUID REFERENCES public.profiles(id) NOT NULL,
  max_participants INTEGER,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  rules JSONB DEFAULT '{}'::jsonb,
  prize_pool TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournament_participants table
CREATE TABLE public.tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

-- Create coach_profiles table
CREATE TABLE public.coach_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  hourly_rate DECIMAL(10,2),
  specialties TEXT[],
  bio TEXT,
  availability JSONB DEFAULT '{}'::jsonb,
  total_students INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Create leaderboard_stats table
CREATE TABLE public.leaderboard_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  annotations_count INTEGER DEFAULT 0,
  helpful_answers_count INTEGER DEFAULT 0,
  tournaments_won INTEGER DEFAULT 0,
  study_sessions INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (TRUE);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "User roles viewable by everyone"
  ON public.user_roles FOR SELECT USING (TRUE);

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for rooms
CREATE POLICY "Rooms viewable by everyone"
  ON public.rooms FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Room creators can update their rooms"
  ON public.rooms FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Room creators and admins can delete rooms"
  ON public.rooms FOR DELETE
  USING (auth.uid() = creator_id OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for room_members
CREATE POLICY "Room members viewable by everyone"
  ON public.room_members FOR SELECT USING (TRUE);

CREATE POLICY "Users can join rooms"
  ON public.room_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms"
  ON public.room_members FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for room_messages
CREATE POLICY "Messages viewable by room members"
  ON public.room_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = room_messages.room_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Room members can send messages"
  ON public.room_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = room_messages.room_id
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for room_annotations
CREATE POLICY "Annotations viewable by room members"
  ON public.room_annotations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = room_annotations.room_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Room members can create annotations"
  ON public.room_annotations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = room_annotations.room_id
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for tournaments
CREATE POLICY "Tournaments viewable by everyone"
  ON public.tournaments FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can create tournaments"
  ON public.tournaments FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their tournaments"
  ON public.tournaments FOR UPDATE
  USING (auth.uid() = organizer_id);

-- RLS Policies for tournament_participants
CREATE POLICY "Participants viewable by everyone"
  ON public.tournament_participants FOR SELECT USING (TRUE);

CREATE POLICY "Users can join tournaments"
  ON public.tournament_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for coach_profiles
CREATE POLICY "Coach profiles viewable by everyone"
  ON public.coach_profiles FOR SELECT USING (TRUE);

CREATE POLICY "Coaches can create their profile"
  ON public.coach_profiles FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    public.has_role(auth.uid(), 'coach')
  );

CREATE POLICY "Coaches can update own profile"
  ON public.coach_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for achievements
CREATE POLICY "Achievements viewable by everyone"
  ON public.achievements FOR SELECT USING (TRUE);

CREATE POLICY "Only admins can manage achievements"
  ON public.achievements FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_achievements
CREATE POLICY "User achievements viewable by everyone"
  ON public.user_achievements FOR SELECT USING (TRUE);

-- RLS Policies for leaderboard_stats
CREATE POLICY "Leaderboard stats viewable by everyone"
  ON public.leaderboard_stats FOR SELECT USING (TRUE);

CREATE POLICY "Stats auto-managed by system"
  ON public.leaderboard_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON public.leaderboard_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable Realtime for messages and annotations
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_annotations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leaderboard_stats_updated_at
  BEFORE UPDATE ON public.leaderboard_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player')
  );
  
  -- Assign default 'player' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'player');
  
  -- Initialize leaderboard stats
  INSERT INTO public.leaderboard_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample achievements
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value)
VALUES
  ('First Steps', 'Join your first study room', '🎓', 'study_sessions', 1),
  ('Annotation Master', 'Create 50 board annotations', '✏️', 'annotations_count', 50),
  ('Helpful Hand', 'Receive 25 helpful votes', '🤝', 'helpful_answers_count', 25),
  ('Tournament Champion', 'Win your first tournament', '🏆', 'tournaments_won', 1),
  ('Community Leader', 'Create 10 discussion rooms', '👑', 'rooms_created', 10);