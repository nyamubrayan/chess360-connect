import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChessBoardComponent } from '@/components/chess/ChessBoard';
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, BookOpen, Lightbulb, AlertCircle, Sparkles } from 'lucide-react';
import { Opening } from '@/pages/Openings';
import { CommunityBar } from '@/components/CommunityBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';

interface OpeningLessonProps {
  opening: Opening;
  onBack: () => void;
  user: any;
}

export const OpeningLesson = ({ opening, onBack, user }: OpeningLessonProps) => {
  const [chess] = useState(new Chess());
  const [position, setPosition] = useState('start');
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState(0);
  const [showingVariation, setShowingVariation] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<string>('');
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [completedLesson, setCompletedLesson] = useState(false);
  const { recordProgress } = useTrainingProgress();

  const currentMoves = showingVariation 
    ? opening.variations[selectedVariation].moves 
    : opening.moves;

  useEffect(() => {
    resetBoard();
  }, [opening, selectedVariation, showingVariation]);

  const resetBoard = () => {
    chess.reset();
    setPosition(chess.fen());
    setCurrentMoveIndex(0);
  };

  const generateExplanation = async (moveIndex: number) => {
    if (moveIndex < 0 || moveIndex >= currentMoves.length) {
      setCurrentExplanation('');
      return;
    }

    setLoadingExplanation(true);
    try {
      const { data, error } = await supabase.functions.invoke('explain-opening-move', {
        body: {
          openingName: opening.name,
          move: currentMoves[moveIndex],
          moveNumber: moveIndex + 1,
          previousMoves: currentMoves.slice(0, moveIndex),
          keyIdeas: opening.keyIdeas
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('Rate limit exceeded. Please wait a moment.');
        } else if (data.error.includes('credits')) {
          toast.error('AI credits exhausted. Please add credits to continue.');
        } else {
          toast.error('Failed to generate explanation');
        }
        setCurrentExplanation('Unable to generate explanation at this time.');
        return;
      }

      setCurrentExplanation(data.explanation || '');
    } catch (error) {
      console.error('Error generating explanation:', error);
      setCurrentExplanation('Unable to generate explanation at this time.');
    } finally {
      setLoadingExplanation(false);
    }
  };

  const makeMove = (moveIndex: number) => {
    chess.reset();
    for (let i = 0; i <= moveIndex && i < currentMoves.length; i++) {
      try {
        chess.move(currentMoves[i]);
      } catch (e) {
        console.error('Invalid move:', currentMoves[i], e);
        break;
      }
    }
    setPosition(chess.fen());
    setCurrentMoveIndex(moveIndex);
    generateExplanation(moveIndex);
  };

  const nextMove = () => {
    if (currentMoveIndex < currentMoves.length - 1) {
      makeMove(currentMoveIndex + 1);
    } else if (!completedLesson && currentMoveIndex === currentMoves.length - 1 && user) {
      // Lesson completed
      setCompletedLesson(true);
      toast.success('🎉 Opening lesson completed!');
      recordProgress({
        trainingType: 'opening',
        trainingId: opening.id,
        completed: true,
        score: 100,
      });
    }
  };

  const previousMove = () => {
    if (currentMoveIndex > 0) {
      makeMove(currentMoveIndex - 1);
    } else {
      resetBoard();
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CommunityBar user={user} />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="secondary" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Openings
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Board Section */}
          <div className="lg:col-span-2">
            <Card className="gradient-card p-4 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
                    <BookOpen className="w-8 h-8" />
                    {opening.name}
                  </h1>
                  <p className="text-muted-foreground mt-1">{opening.description}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={getDifficultyColor(opening.difficulty)}>
                    {opening.difficulty}
                  </Badge>
                  <Badge variant="outline">
                    {opening.color === 'white' ? '♔' : '♚'} {opening.color}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="gradient-card p-4 mb-4">
              <ChessBoardComponent
                position={position}
                onMove={() => {}}
                playerColor="white"
                disabled={true}
                chess={chess}
              />

              {/* Move Controls */}
              <div className="flex items-center justify-center gap-4 mt-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={resetBoard}
                  disabled={currentMoveIndex === 0}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={previousMove}
                  disabled={currentMoveIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-sm font-medium min-w-[100px] text-center">
                  Move {currentMoveIndex + 1} / {currentMoves.length}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextMove}
                  disabled={currentMoveIndex >= currentMoves.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Move List */}
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <h3 className="text-sm font-semibold mb-2">Moves:</h3>
                <div className="flex flex-wrap gap-2">
                  {currentMoves.map((move, index) => (
                    <Button
                      key={index}
                      variant={currentMoveIndex === index ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => makeMove(index)}
                      className="font-mono"
                    >
                      {Math.floor(index / 2) + 1}.{index % 2 === 0 ? '' : '..'} {move}
                    </Button>
                  ))}
                </div>
              </div>

              {/* AI Explanation */}
              {currentMoveIndex >= 0 && currentMoves.length > 0 && (
                <div className="mt-4 p-3 sm:p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold mb-2">
                        Move {currentMoveIndex + 1}: {currentMoves[currentMoveIndex]}
                      </h3>
                      {loadingExplanation ? (
                        <div className="text-sm text-muted-foreground">
                          Generating explanation...
                        </div>
                      ) : currentExplanation ? (
                        <p className="text-sm sm:text-base leading-relaxed">{currentExplanation}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Navigate through moves to see AI explanations
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Info Section */}
          <div className="space-y-4">
            <Tabs defaultValue="main" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="main" onClick={() => setShowingVariation(false)}>
                  Main Line
                </TabsTrigger>
                <TabsTrigger value="variations" onClick={() => setShowingVariation(true)}>
                  Variations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="main" className="space-y-4">
                <Card className="gradient-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      Key Ideas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {opening.keyIdeas.map((idea, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-1">•</span>
                          <span>{idea}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="gradient-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                      Common Mistakes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {opening.commonMistakes.map((mistake, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-destructive mt-1">⚠</span>
                          <span>{mistake}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="variations" className="space-y-4">
                {opening.variations.map((variation, index) => (
                  <Card 
                    key={index}
                    className={`gradient-card cursor-pointer transition-all ${
                      selectedVariation === index && showingVariation
                        ? 'ring-2 ring-primary'
                        : 'hover:ring-1 hover:ring-border'
                    }`}
                    onClick={() => {
                      setSelectedVariation(index);
                      setShowingVariation(true);
                      resetBoard();
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{variation.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {variation.explanation}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1 text-xs font-mono">
                        {variation.moves.slice(0, 6).map((move, idx) => (
                          <span key={idx} className="text-muted-foreground">
                            {Math.floor(idx / 2) + 1}.{idx % 2 === 0 ? '' : '..'} {move}
                          </span>
                        ))}
                        {variation.moves.length > 6 && <span className="text-muted-foreground">...</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};
