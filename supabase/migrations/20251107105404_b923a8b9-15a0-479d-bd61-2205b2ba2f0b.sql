-- Create friends table for friend pairing system
CREATE TABLE public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friends
CREATE POLICY "Users can view their friend requests"
  ON public.friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests"
  ON public.friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friend requests"
  ON public.friends FOR UPDATE
  USING (auth.uid() = friend_id AND status = 'pending');

CREATE POLICY "Users can delete friendships"
  ON public.friends FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Add index for performance
CREATE INDEX idx_friends_user_id ON public.friends(user_id);
CREATE INDEX idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX idx_friends_status ON public.friends(status);

-- Add is_private column to rooms for friend games
ALTER TABLE public.rooms ADD COLUMN is_private BOOLEAN DEFAULT false;

-- Update rooms RLS to handle private games
DROP POLICY IF EXISTS "Rooms viewable by everyone" ON public.rooms;
CREATE POLICY "Public rooms viewable by everyone"
  ON public.rooms FOR SELECT
  USING (
    NOT is_private 
    OR auth.uid() = creator_id 
    OR auth.uid() = white_player_id 
    OR auth.uid() = black_player_id
  );