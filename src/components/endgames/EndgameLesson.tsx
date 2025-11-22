import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChessBoardComponent } from '@/components/chess/ChessBoard';
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';

interface EndgameLessonProps {
  scenario: {
    id: string;
    name: string;
    description: string;
    difficulty: string;
    startingFen: string;
    solutionMoves: string[];
    keyIdeas: string[];
  };
  user: any;
}

export const EndgameLesson = ({ scenario, user }: EndgameLessonProps) => {
  const [game, setGame] = useState<Chess>(new Chess(scenario.startingFen));
  const [position, setPosition] = useState(scenario.startingFen);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentExplanation, setCurrentExplanation] = useState<string>('');
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [completedLesson, setCompletedLesson] = useState(false);
  const { recordProgress } = useTrainingProgress();

  useEffect(() => {
    resetLesson();
  }, [scenario]);

  const resetLesson = () => {
    const newGame = new Chess(scenario.startingFen);
    setGame(newGame);
    setPosition(newGame.fen());
    setCurrentMoveIndex(-1);
    setMoveHistory([]);
    setCurrentExplanation('');
  };

  const generateExplanation = async (moveIndex: number) => {
    if (moveIndex < 0 || moveIndex >= scenario.solutionMoves.length) return;

    console.log('Generating explanation for move', moveIndex + 1, scenario.solutionMoves[moveIndex]);
    setLoadingExplanation(true);
    try {
      const { data, error } = await supabase.functions.invoke('explain-opening-move', {
        body: {
          openingName: `${scenario.name} - Endgame`,
          moveNumber: moveIndex + 1,
          move: scenario.solutionMoves[moveIndex],
          previousMoves: scenario.solutionMoves.slice(0, moveIndex),
          keyIdeas: scenario.keyIdeas,
          isEndgame: true
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        if (error.message?.includes('429')) {
          toast.error('Rate limit reached. Please wait a moment and try again.');
        } else if (error.message?.includes('402')) {
          toast.error('AI usage limit reached. Please add credits to continue.');
        } else {
          console.error('Error generating explanation:', error);
          toast.error('Failed to generate explanation');
        }
        setCurrentExplanation('');
        return;
      }

      console.log('Explanation generated:', data.explanation);
      setCurrentExplanation(data.explanation);
    } catch (err) {
      console.error('Error:', err);
      setCurrentExplanation('');
    } finally {
      setLoadingExplanation(false);
    }
  };

  const nextMove = async () => {
    if (currentMoveIndex >= scenario.solutionMoves.length - 1) {
      // Lesson completed
      if (!completedLesson && user) {
        setCompletedLesson(true);
        toast.success('🎉 Endgame lesson completed!');
        recordProgress({
          trainingType: 'endgame',
          trainingId: scenario.id,
          completed: true,
          score: 100,
        });
      }
      return;
    }

    const newIndex = currentMoveIndex + 1;
    const moveUci = scenario.solutionMoves[newIndex];
    
    const newGame = new Chess(scenario.startingFen);
    for (let i = 0; i <= newIndex; i++) {
      const move = scenario.solutionMoves[i];
      newGame.move(move);
    }

    setGame(newGame);
    setPosition(newGame.fen());
    setCurrentMoveIndex(newIndex);
    setMoveHistory([...scenario.solutionMoves.slice(0, newIndex + 1)]);
    
    await generateExplanation(newIndex);
  };

  const previousMove = async () => {
    if (currentMoveIndex < 0) return;

    const newIndex = currentMoveIndex - 1;
    
    if (newIndex < 0) {
      resetLesson();
      return;
    }

    const newGame = new Chess(scenario.startingFen);
    for (let i = 0; i <= newIndex; i++) {
      const move = scenario.solutionMoves[i];
      newGame.move(move);
    }

    setGame(newGame);
    setPosition(newGame.fen());
    setCurrentMoveIndex(newIndex);
    setMoveHistory([...scenario.solutionMoves.slice(0, newIndex + 1)]);
    
    await generateExplanation(newIndex);
  };

  const handleMove = (from: string, to: string) => {
    // In endgame training, we guide users through the solution
    // This could be extended to allow free play and validate against the solution
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle>{scenario.name}</CardTitle>
            <CardDescription>{scenario.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <ChessBoardComponent
                position={position}
                onMove={handleMove}
                playerColor="white"
                disabled={true}
                chess={game}
              />
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="icon"
                onClick={resetLesson}
                title="Reset to starting position"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={previousMove}
                disabled={currentMoveIndex < 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextMove}
                disabled={currentMoveIndex >= scenario.solutionMoves.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Move {currentMoveIndex + 1} of {scenario.solutionMoves.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle>Key Ideas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {scenario.keyIdeas.map((idea, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{idea}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {currentMoveIndex >= 0 && (
          <Card className="gradient-card">
            <CardContent className="pt-6">
              <div className="p-3 sm:p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold mb-2">
                      Move {currentMoveIndex + 1}: {scenario.solutionMoves[currentMoveIndex]}
                    </h3>
                    {loadingExplanation ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                        Generating AI explanation...
                      </div>
                    ) : currentExplanation ? (
                      <p className="text-sm sm:text-base leading-relaxed">{currentExplanation}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Click the arrow buttons to see AI explanations for each move
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {moveHistory.length > 0 && (
          <Card className="gradient-card">
            <CardHeader>
              <CardTitle>Move History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {moveHistory.map((move, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-muted-foreground">{index + 1}.</span>
                    <span className="font-mono">{move}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
