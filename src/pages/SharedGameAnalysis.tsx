import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Chessboard } from "react-chessboard";
import { Loader2, ChevronLeft, ChevronRight, Brain, Home, CheckCircle, AlertTriangle, TrendingUp, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Move {
  id: string;
  move_san: string;
  move_number: number;
  fen_after: string;
  fen_before: string;
  player_id: string;
  created_at: string;
}

interface MoveAnalysis {
  evaluation: string;
  suggestion: string;
  explanation: string;
  type: "good" | "questionable" | "mistake" | "blunder";
}

export default function SharedGameAnalysis() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [moves, setMoves] = useState<Move[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyzingMove, setAnalyzingMove] = useState(false);
  const [moveAnalysis, setMoveAnalysis] = useState<MoveAnalysis | null>(null);
  const [game, setGame] = useState<any>(null);

  useEffect(() => {
    if (gameId) {
      fetchGameData();
    }
  }, [gameId]);

  useEffect(() => {
    if (moves.length > 0 && currentMoveIndex >= 0) {
      analyzeMoveWithAI();
    }
  }, [currentMoveIndex]);

  const fetchGameData = async () => {
    setLoading(true);
    try {
      // Fetch game details (public access)
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          white_player:profiles!games_white_player_id_fkey(username, rating),
          black_player:profiles!games_black_player_id_fkey(username, rating)
        `)
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;
      setGame(gameData);

      // Fetch all moves (public access)
      const { data: movesData, error: movesError } = await supabase
        .from('game_moves')
        .select('*')
        .eq('game_id', gameId)
        .order('move_number', { ascending: true });

      if (movesError) throw movesError;
      setMoves(movesData || []);
    } catch (error) {
      console.error('Error fetching game data:', error);
      toast.error('Failed to load game data');
    } finally {
      setLoading(false);
    }
  };

  const analyzeMoveWithAI = async () => {
    if (currentMoveIndex < 0 || currentMoveIndex >= moves.length) return;
    
    setAnalyzingMove(true);
    setMoveAnalysis(null);
    
    try {
      const currentMove = moves[currentMoveIndex];
      const playerColor = currentMove.player_id === game?.white_player_id ? 'white' : 'black';
      
      const { data, error } = await supabase.functions.invoke('analyze-move', {
        body: {
          fen: currentMove.fen_after,
          lastMove: currentMove.move_san,
          playerColor
        }
      });

      if (error) throw error;
      setMoveAnalysis(data.analysis);
    } catch (error: any) {
      console.error('Error analyzing move:', error);
      if (error.message?.includes('rate limit')) {
        setMoveAnalysis({
          evaluation: "Analysis temporarily unavailable due to rate limits.",
          suggestion: "",
          explanation: "Please try again in a moment.",
          type: "questionable"
        });
      }
    } finally {
      setAnalyzingMove(false);
    }
  };

  const getCurrentPosition = () => {
    if (moves.length === 0) return "start";
    if (currentMoveIndex < 0) return "start";
    return moves[currentMoveIndex].fen_after;
  };

  const goToMove = (index: number) => {
    setCurrentMoveIndex(Math.max(-1, Math.min(index, moves.length - 1)));
  };

  const getMoveTypeIcon = (type: string) => {
    switch (type) {
      case "good":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "questionable":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "mistake":
        return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case "blunder":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getMoveTypeColor = (type: string) => {
    switch (type) {
      case "good":
        return "bg-green-500/20 border-green-500";
      case "questionable":
        return "bg-yellow-500/20 border-yellow-500";
      case "mistake":
        return "bg-orange-500/20 border-orange-500";
      case "blunder":
        return "bg-red-500/20 border-red-500";
      default:
        return "bg-muted border-border";
    }
  };

  const getPlayerColor = (playerId: string) => {
    return playerId === game?.white_player_id ? 'White' : 'Black';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Game Not Found</h2>
          <p className="text-muted-foreground mb-6">The game analysis you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/')}>
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate('/')}>
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Brain className="h-6 w-6" />
                Shared Game Analysis
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span>
                  <span className="font-semibold text-foreground">{game.white_player.username}</span> ({game.white_player.rating})
                </span>
                <span>vs</span>
                <span>
                  <span className="font-semibold text-foreground">{game.black_player.username}</span> ({game.black_player.rating})
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Game Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Chessboard */}
          <div className="space-y-4">
            <Card className="p-4">
              <Chessboard
                position={getCurrentPosition()}
                boardWidth={Math.min(500, window.innerWidth - 80)}
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              />
            </Card>

            {/* Navigation Controls */}
            <Card className="p-4">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToMove(currentMoveIndex - 1)}
                  disabled={currentMoveIndex <= 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  Move {currentMoveIndex + 1} of {moves.length}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToMove(currentMoveIndex + 1)}
                  disabled={currentMoveIndex >= moves.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Right: Move List & Analysis */}
          <div className="space-y-4">
            {/* Move History */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Move History
              </h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {moves.map((move, index) => (
                    <button
                      key={move.id}
                      onClick={() => goToMove(index)}
                      className={`w-full text-left p-2 rounded hover:bg-accent/50 transition-colors ${
                        index === currentMoveIndex ? 'bg-primary/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          <span className="text-muted-foreground font-medium">
                            {Math.floor(move.move_number / 2) + 1}.
                          </span>
                          {move.move_number % 2 === 0 ? ' ' : '.. '}
                          <span className="font-mono font-semibold">{move.move_san}</span>
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getPlayerColor(move.player_id)}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            {/* AI Analysis */}
            <Card className={`p-4 border-2 ${moveAnalysis ? getMoveTypeColor(moveAnalysis.type) : 'border-border'}`}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Analysis
                {moveAnalysis && getMoveTypeIcon(moveAnalysis.type)}
              </h3>
              
              {analyzingMove ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : moveAnalysis ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Evaluation</p>
                    <p className="text-sm">{moveAnalysis.evaluation}</p>
                  </div>
                  
                  {moveAnalysis.suggestion && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Suggestion</p>
                      <p className="text-sm font-medium text-primary">{moveAnalysis.suggestion}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Explanation</p>
                    <p className="text-sm">{moveAnalysis.explanation}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Select a move to see AI analysis
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
