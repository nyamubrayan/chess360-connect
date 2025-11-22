import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Chess } from 'chess.js';
import { ChessBoardComponent } from '@/components/chess/ChessBoard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Lightbulb, TrendingUp, AlertCircle, Loader2, RotateCcw, ArrowLeft } from 'lucide-react';
import { CommunityBar } from '@/components/CommunityBar';
import { toast } from 'sonner';

interface MoveAnalysis {
  evaluation: string;
  suggestion: string;
  explanation: string;
  type: "good" | "questionable" | "mistake" | "blunder";
}

export default function AICoach() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [chess] = useState(new Chess());
  const [position, setPosition] = useState(chess.fen());
  const [analysis, setAnalysis] = useState<MoveAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [lastMove, setLastMove] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
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

  const analyzeMoveInRealTime = async (moveNotation: string) => {
    setIsAnalyzing(true);
    setMoveCount(prev => prev + 1);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-move', {
        body: {
          fen: position,
          lastMove: moveNotation,
          playerColor: chess.turn() === 'w' ? 'black' : 'white', // Analyze the move just made
        },
      });

      if (error) throw error;

      setAnalysis(data.analysis);
    } catch (error: any) {
      console.error('Error analyzing move:', error);
      toast.error('Failed to analyze move. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMove = async (from: string, to: string) => {
    try {
      const move = chess.move({ from, to, promotion: 'q' });
      
      if (move) {
        const newPosition = chess.fen();
        setPosition(newPosition);
        setLastMove(`${move.from}${move.to}`);
        
        // Analyze the move that was just made
        await analyzeMoveInRealTime(move.san);
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
  };

  const handleReset = () => {
    chess.reset();
    setPosition(chess.fen());
    setAnalysis(null);
    setMoveCount(0);
    setLastMove(null);
    toast.success('Board reset');
  };

  const getMoveTypeColor = (type: string) => {
    switch (type) {
      case "good": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "questionable": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "mistake": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "blunder": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getMoveTypeIcon = (type: string) => {
    switch (type) {
      case "good": return <TrendingUp className="w-4 h-4" />;
      case "questionable": return <Lightbulb className="w-4 h-4" />;
      case "mistake": return <AlertCircle className="w-4 h-4" />;
      case "blunder": return <AlertCircle className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="gradient-card p-6">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CommunityBar user={user} />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/training')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Training
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                AI Coach Training
              </h1>
              <p className="text-lg text-muted-foreground">
                Make moves and receive instant AI analysis and feedback on every move
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Board
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chessboard */}
          <div className="lg:col-span-2">
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Practice Board</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    Move {moveCount}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full max-w-2xl mx-auto">
                  <ChessBoardComponent
                    position={position}
                    onMove={handleMove}
                    playerColor="white"
                    disabled={false}
                    chess={chess}
                  />
                </div>
                
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  {chess.isCheckmate() ? (
                    <span className="text-destructive font-semibold">Checkmate!</span>
                  ) : chess.isCheck() ? (
                    <span className="text-yellow-500 font-semibold">Check!</span>
                  ) : chess.isDraw() ? (
                    <span className="text-muted-foreground font-semibold">Draw</span>
                  ) : (
                    <span>
                      {chess.turn() === 'w' ? 'White' : 'Black'} to move
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Analysis Panel */}
          <div className="lg:col-span-1">
            <Card className="gradient-card border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    Instant Analysis
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isAnalyzing ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Analyzing...</span>
                  </div>
                ) : analysis ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge className={getMoveTypeColor(analysis.type)}>
                        {getMoveTypeIcon(analysis.type)}
                        <span className="ml-1 capitalize">{analysis.type}</span>
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          Position Evaluation
                        </p>
                        <p className="text-sm">{analysis.evaluation}</p>
                      </div>

                      {analysis.type !== "good" && (
                        <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                          <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />
                            Better Move
                          </p>
                          <p className="text-sm">{analysis.suggestion}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          Explanation
                        </p>
                        <p className="text-sm text-muted-foreground">{analysis.explanation}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Make a move to receive instant AI feedback and analysis
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions Card */}
            <Card className="gradient-card mt-4">
              <CardHeader>
                <CardTitle className="text-base">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Play any moves on the board</p>
                <p>• AI analyzes each move instantly</p>
                <p>• Get feedback on move quality</p>
                <p>• Learn from suggestions</p>
                <p>• Reset anytime to practice more</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
