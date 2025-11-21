import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Chess } from 'chess.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChessBoardComponent } from '@/components/chess/ChessBoard';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, XCircle, Trophy, Target, Brain } from 'lucide-react';
import { useChessSounds } from '@/hooks/useChessSounds';

interface Puzzle {
  id: string;
  fen: string;
  solution_moves: string[];
  difficulty: string;
  theme: string;
  description: string;
  rating: number;
}

export default function Puzzles() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [chess, setChess] = useState<Chess>(new Chess());
  const [position, setPosition] = useState('');
  const [moveIndex, setMoveIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const sounds = useChessSounds();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
      fetchPuzzles();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchPuzzles = async () => {
    setLoading(true);
    let query = supabase
      .from('puzzles')
      .select('*')
      .order('rating', { ascending: true });

    if (filter !== 'all') {
      query = query.eq('difficulty', filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching puzzles:', error);
      toast.error('Failed to load puzzles');
      return;
    }

    // Transform the data to ensure solution_moves is string[]
    const transformedData = (data || []).map(puzzle => ({
      ...puzzle,
      solution_moves: Array.isArray(puzzle.solution_moves) 
        ? puzzle.solution_moves as string[]
        : JSON.parse(puzzle.solution_moves as string) as string[]
    }));

    setPuzzles(transformedData);
    setLoading(false);
  };

  useEffect(() => {
    fetchPuzzles();
  }, [filter]);

  const loadPuzzle = (puzzle: Puzzle) => {
    const newChess = new Chess(puzzle.fen);
    setChess(newChess);
    setPosition(puzzle.fen);
    setCurrentPuzzle(puzzle);
    setMoveIndex(0);
    setSolved(false);
    setAttempts(0);
    setStartTime(Date.now());
  };

  const handleMove = async (from: string, to: string) => {
    if (!currentPuzzle || solved) return;

    const move = chess.move({ from, to, promotion: 'q' });
    
    if (!move) {
      toast.error('Invalid move');
      return;
    }

    const expectedMove = currentPuzzle.solution_moves[moveIndex];
    
    if (move.san !== expectedMove) {
      setAttempts(prev => prev + 1);
      chess.undo();
      sounds.playCapture();
      toast.error(`Wrong move! Try again. Expected: ${expectedMove}`, { duration: 3000 });
      return;
    }

    sounds.playMove();
    setPosition(chess.fen());
    setMoveIndex(prev => prev + 1);

    // Check if puzzle is solved
    if (moveIndex + 1 >= currentPuzzle.solution_moves.length) {
      setSolved(true);
      sounds.playCheckmate();
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      toast.success('🎉 Puzzle solved! Well done!', { duration: 5000 });

      // Save attempt
      await supabase.from('user_puzzle_attempts').insert({
        user_id: user.id,
        puzzle_id: currentPuzzle.id,
        solved: true,
        attempts: attempts + 1,
        time_spent: timeSpent,
        completed_at: new Date().toISOString(),
      });

      return;
    }

    // Make opponent's response move if there is one
    setTimeout(() => {
      const nextMove = currentPuzzle.solution_moves[moveIndex + 1];
      if (nextMove) {
        const opponentMove = chess.move(nextMove);
        if (opponentMove) {
          setPosition(chess.fen());
          setMoveIndex(prev => prev + 1);
        }
      }
    }, 500);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-orange-500';
      case 'expert': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="gradient-card p-6">
          <p className="text-muted-foreground">Loading puzzles...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="secondary" size="sm" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Home
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8" />
            Tactical Puzzles
          </h1>
          <div className="w-20" />
        </div>

        {!currentPuzzle ? (
          <div>
            <Card className="gradient-card p-4 mb-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All Puzzles
                </Button>
                <Button
                  variant={filter === 'beginner' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('beginner')}
                >
                  Beginner
                </Button>
                <Button
                  variant={filter === 'intermediate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('intermediate')}
                >
                  Intermediate
                </Button>
                <Button
                  variant={filter === 'advanced' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('advanced')}
                >
                  Advanced
                </Button>
                <Button
                  variant={filter === 'expert' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('expert')}
                >
                  Expert
                </Button>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {puzzles.map((puzzle) => (
                <Card key={puzzle.id} className="gradient-card hover:glow-primary transition-all cursor-pointer" onClick={() => loadPuzzle(puzzle)}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>{puzzle.theme}</span>
                      <Badge className={getDifficultyColor(puzzle.difficulty)}>
                        {puzzle.difficulty}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">{puzzle.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {puzzle.rating}
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="w-4 h-4" />
                        {puzzle.solution_moves.length} moves
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card className="gradient-card p-4 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-xl font-bold">{currentPuzzle.theme}</h2>
                    <p className="text-sm text-muted-foreground">{currentPuzzle.description}</p>
                  </div>
                  <Badge className={getDifficultyColor(currentPuzzle.difficulty)}>
                    {currentPuzzle.difficulty}
                  </Badge>
                </div>
              </Card>

              <ChessBoardComponent
                position={position}
                onMove={handleMove}
                playerColor={chess.turn() === 'w' ? 'white' : 'black'}
                disabled={solved}
                chess={chess}
              />

              {solved && (
                <Card className="gradient-card p-4 mt-4 border-green-500 bg-green-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <h3 className="text-lg font-bold">Puzzle Solved!</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Time: {Math.floor((Date.now() - startTime) / 1000)}s | Attempts: {attempts + 1}
                  </p>
                  <Button onClick={() => setCurrentPuzzle(null)}>
                    Try Another Puzzle
                  </Button>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              <Card className="gradient-card p-4">
                <h3 className="text-lg font-bold mb-3">Puzzle Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rating:</span>
                    <span className="font-medium">{currentPuzzle.rating}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Solution Length:</span>
                    <span className="font-medium">{currentPuzzle.solution_moves.length} moves</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Progress:</span>
                    <span className="font-medium">
                      {moveIndex} / {currentPuzzle.solution_moves.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attempts:</span>
                    <span className="font-medium">{attempts}</span>
                  </div>
                </div>
              </Card>

              <Button variant="outline" className="w-full" onClick={() => setCurrentPuzzle(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Puzzles
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
