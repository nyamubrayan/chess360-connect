-- Create study rooms table
CREATE TABLE public.study_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  annotations JSONB DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT true,
  max_participants INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create study room participants table
CREATE TABLE public.study_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create study room messages table
CREATE TABLE public.study_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_rooms
CREATE POLICY "Public rooms viewable by everyone"
  ON public.study_rooms FOR SELECT
  USING (is_public = true OR creator_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.study_room_participants 
    WHERE room_id = id AND user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can create rooms"
  ON public.study_rooms FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their rooms"
  ON public.study_rooms FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their rooms"
  ON public.study_rooms FOR DELETE
  USING (auth.uid() = creator_id);

-- RLS Policies for study_room_participants
CREATE POLICY "Participants viewable by room members"
  ON public.study_room_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.study_rooms 
    WHERE id = room_id AND (is_public = true OR creator_id = auth.uid() OR user_id = auth.uid())
  ));

CREATE POLICY "Users can join public rooms"
  ON public.study_room_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.study_rooms WHERE id = room_id AND is_public = true
  ));

CREATE POLICY "Users can leave rooms"
  ON public.study_room_participants FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for study_room_messages
CREATE POLICY "Messages viewable by room participants"
  ON public.study_room_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.study_room_participants 
    WHERE room_id = study_room_messages.room_id AND user_id = auth.uid()
  ));

CREATE POLICY "Participants can send messages"
  ON public.study_room_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.study_room_participants 
    WHERE room_id = study_room_messages.room_id AND user_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_study_rooms_creator ON public.study_rooms(creator_id);
CREATE INDEX idx_study_room_participants_room ON public.study_room_participants(room_id);
CREATE INDEX idx_study_room_participants_user ON public.study_room_participants(user_id);
CREATE INDEX idx_study_room_messages_room ON public.study_room_messages(room_id);

-- Trigger for updated_at
CREATE TRIGGER update_study_rooms_updated_at
  BEFORE UPDATE ON public.study_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for study rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_messages;