import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChessBoardComponent } from '@/components/chess/ChessBoard';
import { useChessSounds } from '@/hooks/useChessSounds';
import { toast } from 'sonner';
import { Brain, CheckCircle, XCircle, RefreshCw, Trophy } from 'lucide-react';

interface PuzzleChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  playerName: string;
}

interface Puzzle {
  id: string;
  fen: string;
  solution_moves: string[];
  difficulty: string;
  theme: string;
  description: string;
}

export function PuzzleChallengeDialog({
  open,
  onOpenChange,
  onSuccess,
  playerName,
}: PuzzleChallengeDialogProps) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [chess, setChess] = useState<Chess>(new Chess());
  const [position, setPosition] = useState('');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [moveIndex, setMoveIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [usedPuzzleIds, setUsedPuzzleIds] = useState<string[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<{
    fastestTime: number | null;
    totalAttempts: number;
    successfulSolves: number;
    successRate: number;
  } | null>(null);
  const sounds = useChessSounds();

  useEffect(() => {
    if (open && !puzzle) {
      fetchRandomPuzzle();
    }
  }, [open]);

  // Auto-fetch new puzzle after 3 failed attempts
  useEffect(() => {
    if (attempts >= 3 && !solved) {
      toast.info('Let\'s try a different puzzle!');
      setTimeout(() => {
        fetchRandomPuzzle();
      }, 1500);
    }
  }, [attempts, solved]);

  const fetchRandomPuzzle = async () => {
    setLoading(true);
    try {
      // Fetch puzzles excluding already used ones
      let query = supabase
        .from('puzzles')
        .select('*')
        .in('difficulty', ['beginner', 'intermediate']);
      
      // Exclude recently used puzzles
      if (usedPuzzleIds.length > 0) {
        query = query.not('id', 'in', `(${usedPuzzleIds.join(',')})`);
      }
      
      const { data, error } = await query.limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        // Select random puzzle from results
        const randomPuzzle = data[Math.floor(Math.random() * data.length)];
        const transformedPuzzle = {
          ...randomPuzzle,
          solution_moves: Array.isArray(randomPuzzle.solution_moves)
            ? (randomPuzzle.solution_moves as string[])
            : (JSON.parse(randomPuzzle.solution_moves as string) as string[]),
        };
        
        // Track this puzzle to avoid repeats (keep last 5)
        setUsedPuzzleIds(prev => {
          const updated = [...prev, randomPuzzle.id];
          return updated.slice(-5);
        });
        
        loadPuzzle(transformedPuzzle);
      } else if (usedPuzzleIds.length > 0) {
        // If no new puzzles available, reset used list and try again
        setUsedPuzzleIds([]);
        fetchRandomPuzzle();
      }
    } catch (error) {
      console.error('Error fetching puzzle:', error);
      toast.error('Failed to load puzzle');
    } finally {
      setLoading(false);
    }
  };

  const loadPuzzle = (puzzleData: Puzzle) => {
    const newChess = new Chess(puzzleData.fen);
    setChess(newChess);
    setPosition(puzzleData.fen);
    setPlayerColor(newChess.turn() === 'w' ? 'white' : 'black');
    setPuzzle(puzzleData);
    setMoveIndex(0);
    setSolved(false);
    setAttempts(0);
    setStartTime(Date.now());
    fetchLeaderboardData(puzzleData.id);
  };

  const fetchLeaderboardData = async (puzzleId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_puzzle_attempts')
        .select('time_spent, solved')
        .eq('puzzle_id', puzzleId);

      if (error) throw error;

      if (data && data.length > 0) {
        const successfulSolves = data.filter((d) => d.solved && d.time_spent).length;
        const totalAttempts = data.length;
        const fastestTime = data
          .filter((d) => d.solved && d.time_spent)
          .reduce((min, curr) => {
            return curr.time_spent! < min ? curr.time_spent! : min;
          }, Infinity);

        setLeaderboardData({
          fastestTime: fastestTime === Infinity ? null : fastestTime,
          totalAttempts,
          successfulSolves,
          successRate: totalAttempts > 0 ? (successfulSolves / totalAttempts) * 100 : 0,
        });
      } else {
        setLeaderboardData({
          fastestTime: null,
          totalAttempts: 0,
          successfulSolves: 0,
          successRate: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    }
  };

  const handleMove = async (from: string, to: string) => {
    if (!puzzle || solved) return;

    const move = chess.move({ from, to, promotion: 'q' });

    if (!move) {
      toast.error('Invalid move');
      return;
    }

    const expectedMove = puzzle.solution_moves[moveIndex];

    if (move.san !== expectedMove) {
      setAttempts((prev) => prev + 1);
      chess.undo();
      sounds.playCapture();
      toast.error(`Wrong move! Expected: ${expectedMove}. Try again!`, { duration: 3000 });
      return;
    }

    sounds.playMove();
    setPosition(chess.fen());
    setMoveIndex((prev) => prev + 1);

    // Check if puzzle is solved
    if (moveIndex + 1 >= puzzle.solution_moves.length) {
      setSolved(true);
      sounds.playCheckmate();
      
      // Record puzzle attempt
      const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : null;
      recordPuzzleAttempt(puzzle.id, true, timeSpent);
      
      toast.success('🎉 Puzzle solved! Sending friend request...', { duration: 3000 });
      
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
      return;
    }

    // Make opponent's response move if there is one
    setTimeout(() => {
      const nextMove = puzzle.solution_moves[moveIndex + 1];
      if (nextMove) {
        const opponentMove = chess.move(nextMove);
        if (opponentMove) {
          setPosition(chess.fen());
          setMoveIndex((prev) => prev + 1);
        }
      }
    }, 500);
  };

  const recordPuzzleAttempt = async (puzzleId: string, isSolved: boolean, timeSpent: number | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_puzzle_attempts').insert({
        user_id: user.id,
        puzzle_id: puzzleId,
        solved: isSolved,
        time_spent: timeSpent,
        attempts: attempts + 1,
        completed_at: isSolved ? new Date().toISOString() : null,
      });

      // Refresh leaderboard data
      if (isSolved) {
        fetchLeaderboardData(puzzleId);
      }
    } catch (error) {
      console.error('Error recording puzzle attempt:', error);
    }
  };

  const handleClose = () => {
    setPuzzle(null);
    setChess(new Chess());
    setPosition('');
    setMoveIndex(0);
    setSolved(false);
    setAttempts(0);
    setStartTime(null);
    setLeaderboardData(null);
    onOpenChange(false);
  };

  const handleRetry = () => {
    if (puzzle) {
      loadPuzzle(puzzle);
    }
  };

  const handleNewPuzzle = () => {
    fetchRandomPuzzle();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Puzzle Challenge: Prove Your Chess Skills!
          </DialogTitle>
          <DialogDescription>
            Solve this chess puzzle to send a ChessMate request to <strong>{playerName}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading puzzle...</p>
          </div>
        ) : puzzle ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="mb-4 p-3 bg-accent/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{puzzle.theme}</h3>
                  <Badge variant="secondary">{puzzle.difficulty}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{puzzle.description}</p>
              </div>

              <ChessBoardComponent
                position={position}
                onMove={handleMove}
                playerColor={playerColor}
                disabled={solved}
                chess={chess}
              />

              {solved && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div>
                      <h3 className="font-bold text-green-500">Puzzle Solved!</h3>
                      <p className="text-sm text-muted-foreground">
                        Sending ChessMate request...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-accent/20 rounded-lg space-y-3">
                <h3 className="font-semibold">Progress</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Moves:</span>
                    <span className="font-medium">
                      {moveIndex} / {puzzle.solution_moves.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attempts:</span>
                    <span className="font-medium">{attempts}</span>
                  </div>
                </div>
              </div>

              {leaderboardData && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    Leaderboard Stats
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Players Solved:</span>
                      <span className="font-medium text-primary">
                        {leaderboardData.successfulSolves}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Success Rate:</span>
                      <span className="font-medium">
                        {leaderboardData.successRate.toFixed(1)}%
                      </span>
                    </div>
                    {leaderboardData.fastestTime && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fastest Time:</span>
                        <span className="font-medium text-primary">
                          {leaderboardData.fastestTime}s
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={handleRetry}
                disabled={solved}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Restart This Puzzle
              </Button>

              <Button
                variant="default"
                className="w-full"
                onClick={handleNewPuzzle}
                disabled={solved || loading}
              >
                <Brain className="w-4 h-4 mr-2" />
                Try Different Puzzle
              </Button>

              <Button variant="ghost" className="w-full" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
