-- Create matchmaking queue table
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  time_control INTEGER NOT NULL,
  rating_range INTEGER DEFAULT 200,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  matched_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own queue entries"
ON public.matchmaking_queue FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queue entries"
ON public.matchmaking_queue FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue entries"
ON public.matchmaking_queue FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queue entries"
ON public.matchmaking_queue FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster matching queries
CREATE INDEX idx_matchmaking_status ON public.matchmaking_queue(status, created_at);
CREATE INDEX idx_matchmaking_user ON public.matchmaking_queue(user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;

-- Trigger for updated_at
CREATE TRIGGER update_matchmaking_queue_updated_at
BEFORE UPDATE ON public.matchmaking_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add disconnection tracking to rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS white_last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS black_last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS auto_resign_timeout INTEGER DEFAULT 30;