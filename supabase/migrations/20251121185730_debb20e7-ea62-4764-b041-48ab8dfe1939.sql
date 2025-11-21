-- Create puzzles table
CREATE TABLE public.puzzles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fen TEXT NOT NULL,
  solution_moves JSONB NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
  theme TEXT NOT NULL,
  description TEXT,
  rating INTEGER DEFAULT 1500,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user puzzle attempts table
CREATE TABLE public.user_puzzle_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  puzzle_id UUID NOT NULL REFERENCES public.puzzles(id) ON DELETE CASCADE,
  solved BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 1,
  time_spent INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_puzzle_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for puzzles
CREATE POLICY "Puzzles are viewable by everyone" 
ON public.puzzles 
FOR SELECT 
USING (true);

-- RLS Policies for user_puzzle_attempts
CREATE POLICY "Users can view their own attempts" 
ON public.user_puzzle_attempts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attempts" 
ON public.user_puzzle_attempts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts" 
ON public.user_puzzle_attempts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Insert sample puzzles
INSERT INTO public.puzzles (fen, solution_moves, difficulty, theme, description, rating) VALUES
  -- Beginner puzzles
  ('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 
   '["Qxf7"]'::jsonb, 
   'beginner', 
   'Scholar''s Mate', 
   'Deliver checkmate with the queen', 
   800),
  
  ('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 5',
   '["Nxe5", "Nxe5", "Qf3"]'::jsonb,
   'beginner',
   'Knight Fork',
   'Win material with a knight fork',
   900),
  
  -- Intermediate puzzles
  ('r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8',
   '["Bxf7", "Kxf7", "Ng5"]'::jsonb,
   'intermediate',
   'Greek Gift Sacrifice',
   'Sacrifice bishop to expose the king',
   1400),
   
  ('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 b kq - 0 6',
   '["Nxe4", "dxe4", "Bxf2", "Kxf2", "Qh4"]'::jsonb,
   'intermediate',
   'Pin and Win',
   'Exploit the pin to win material',
   1500),
  
  -- Advanced puzzles
  ('r2q1rk1/ppp2ppp/2n1bn2/2bpp3/4P3/2PP1N2/PPB2PPP/RNBQ1RK1 w - - 0 9',
   '["Bxf7", "Rxf7", "Ng5", "Rf8", "Qh5"]'::jsonb,
   'advanced',
   'Greek Gift with Follow-up',
   'Classic bishop sacrifice leading to mate',
   1800),
   
  ('r1bqr1k1/pp3pbp/2pp1np1/3Pp3/2P1P3/2N3P1/PP2NPBP/R1BQR1K1 w - - 0 13',
   '["Nxd5", "cxd5", "Bxd5", "Nxd5", "Qxd5"]'::jsonb,
   'advanced',
   'Clearance Sacrifice',
   'Clear the path for a powerful attack',
   1900),
   
  -- Expert puzzles  
  ('r2q1rk1/1p3p1p/p1n1p1pB/2ppP3/3n4/P1PP4/1PQ2PPP/R3K1NR w KQ - 0 15',
   '["Bxg6", "fxg6", "Qxg6", "Kh8", "Qh6", "Kg8", "Qg7"]'::jsonb,
   'expert',
   'Queen Sacrifice Mate',
   'Find the brilliant queen sacrifice',
   2200),
   
  ('1r3rk1/4qp1p/p3p1pB/2ppP3/3n4/P1PP4/1PQ2PPP/R3K1NR w KQ - 0 18',
   '["Qg6", "fxg6", "Bxe6", "Kh8", "Bf7"]'::jsonb,
   'expert',
   'Back Rank Mate Pattern',
   'Exploit weak back rank for checkmate',
   2300);