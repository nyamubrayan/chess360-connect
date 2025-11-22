import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Calendar, Brain, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { GameMoveAnalysis } from "./GameMoveAnalysis";
import { GamePerformanceAnalysis } from "./GamePerformanceAnalysis";

interface Game {
  id: string;
  white_player_id: string;
  black_player_id: string;
  winner_id: string | null;
  result: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  time_control: number;
  white_player: { username: string; rating: number };
  black_player: { username: string; rating: number };
}

interface GameHistoryProps {
  userId: string;
  limit?: number;
  showAnalyzeButton?: boolean;
}

export const GameHistory = ({ userId, limit = 10, showAnalyzeButton = false }: GameHistoryProps) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [showMoveAnalysis, setShowMoveAnalysis] = useState(false);
  const [showPerformanceAnalysis, setShowPerformanceAnalysis] = useState(false);

  useEffect(() => {
    fetchGames();
  }, [userId, limit]);

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          white_player:profiles!games_white_player_id_fkey(username, rating),
          black_player:profiles!games_black_player_id_fkey(username, rating)
        `)
        .or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
      toast.error('Failed to load game history');
    } finally {
      setLoading(false);
    }
  };

  const openPerformanceAnalysis = (gameId: string) => {
    setSelectedGameId(gameId);
    setShowPerformanceAnalysis(true);
  };

  const getResultBadge = (game: Game) => {
    if (!game.winner_id) {
      return <Badge variant="secondary">Draw</Badge>;
    }
    
    const isWinner = game.winner_id === userId;
    return isWinner ? (
      <Badge className="bg-green-500 hover:bg-green-600">Win</Badge>
    ) : (
      <Badge variant="destructive">Loss</Badge>
    );
  };

  const getOpponent = (game: Game) => {
    if (game.white_player_id === userId) {
      return {
        username: game.black_player.username,
        rating: game.black_player.rating,
        color: 'black'
      };
    }
    return {
      username: game.white_player.username,
      rating: game.white_player.rating,
      color: 'white'
    };
  };

  const getPlayerColor = (game: Game) => {
    return game.white_player_id === userId ? 'White' : 'Black';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Game History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (games.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Game History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No games played yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Game History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {games.map((game) => {
            const opponent = getOpponent(game);
            const playerColor = getPlayerColor(game);
            
            return (
              <Card key={game.id} className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getResultBadge(game)}
                      <Badge variant="outline">{playerColor}</Badge>
                      <span className="text-sm text-muted-foreground">vs</span>
                      <span className="font-semibold">{opponent.username}</span>
                      <Badge variant="secondary">{opponent.rating}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {Math.floor(game.time_control / 60)}min
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {game.completed_at 
                          ? formatDistanceToNow(new Date(game.completed_at), { addSuffix: true })
                          : 'In progress'}
                      </div>
                      {game.result && (
                        <Badge variant="outline" className="text-xs">
                          {game.result}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedGameId(game.id);
                        setShowMoveAnalysis(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    
                    {showAnalyzeButton && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPerformanceAnalysis(game.id)}
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        Analyze
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </CardContent>

      {selectedGameId && (
        <>
          <GameMoveAnalysis
            gameId={selectedGameId}
            open={showMoveAnalysis}
            onOpenChange={setShowMoveAnalysis}
          />
          <GamePerformanceAnalysis
            gameId={selectedGameId}
            open={showPerformanceAnalysis}
            onOpenChange={setShowPerformanceAnalysis}
          />
        </>
      )}
    </Card>
  );
};
