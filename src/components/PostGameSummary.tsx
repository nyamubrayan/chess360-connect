import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, TrendingDown, Target, Lightbulb, Loader2, Download, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PostGameSummaryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  result: string;
  playerColor: "white" | "black";
  onRequestRematch?: () => void;
  onFindNewMatch?: () => void;
}

interface GameSummary {
  overall_rating: string;
  strengths: string[];
  weaknesses: string[];
  key_moments: Array<{
    move: string;
    description: string;
    type: string;
  }>;
  suggestions: string;
}

interface PlayerInfo {
  id: string;
  username: string;
  display_name: string | null;
  ratingChange: number;
  newRating: number;
  oldRating: number;
}

export const PostGameSummary = ({ open, onOpenChange, gameId, result, playerColor, onRequestRematch, onFindNewMatch }: PostGameSummaryProps) => {
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [whitePlayer, setWhitePlayer] = useState<PlayerInfo | null>(null);
  const [blackPlayer, setBlackPlayer] = useState<PlayerInfo | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);

  useEffect(() => {
    if (open && gameId) {
      fetchOrGenerateSummary();
      fetchPlayersInfo();
    }
  }, [open, gameId]);

  const fetchPlayersInfo = async () => {
    try {
      // Fetch game data to get both players' rating changes and winner
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('white_player_id, black_player_id, white_rating_change, black_rating_change, time_control, winner_id')
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;

      setWinnerId(game.winner_id);

      // Determine game category to fetch correct rating
      const getGameCategory = (timeControl: number) => {
        if (timeControl < 3) return 'bullet';
        if (timeControl < 10) return 'blitz';
        return 'rapid';
      };
      
      const category = getGameCategory(game.time_control);
      const ratingField = `${category}_rating` as 'bullet_rating' | 'blitz_rating' | 'rapid_rating';

      // Fetch both players' profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, bullet_rating, blitz_rating, rapid_rating')
        .in('id', [game.white_player_id, game.black_player_id]);

      if (profilesError) throw profilesError;

      const whiteProfile = profiles?.find(p => p.id === game.white_player_id);
      const blackProfile = profiles?.find(p => p.id === game.black_player_id);

      if (whiteProfile) {
        const currentRating = whiteProfile[ratingField] || 1200;
        setWhitePlayer({
          id: whiteProfile.id,
          username: whiteProfile.username,
          display_name: whiteProfile.display_name,
          ratingChange: game.white_rating_change || 0,
          newRating: currentRating,
          oldRating: currentRating - (game.white_rating_change || 0),
        });
      }

      if (blackProfile) {
        const currentRating = blackProfile[ratingField] || 1200;
        setBlackPlayer({
          id: blackProfile.id,
          username: blackProfile.username,
          display_name: blackProfile.display_name,
          ratingChange: game.black_rating_change || 0,
          newRating: currentRating,
          oldRating: currentRating - (game.black_rating_change || 0),
        });
      }
    } catch (error) {
      console.error('Error fetching players info:', error);
    }
  };

  const fetchOrGenerateSummary = async () => {
    setIsLoading(true);
    try {
      // Check if summary already exists
      const { data: existingSummary } = await supabase
        .from("game_analysis")
        .select("*")
        .eq("game_id", gameId)
        .single();

      if (existingSummary) {
        setSummary({
          overall_rating: existingSummary.overall_rating || "",
          strengths: Array.isArray(existingSummary.strengths) ? existingSummary.strengths as string[] : [],
          weaknesses: Array.isArray(existingSummary.weaknesses) ? existingSummary.weaknesses as string[] : [],
          key_moments: Array.isArray(existingSummary.key_moments) ? existingSummary.key_moments as Array<{move: string; description: string; type: string;}> : [],
          suggestions: existingSummary.suggestions || "",
        });
      } else {
        // Generate new summary
        const { data, error } = await supabase.functions.invoke('analyze-game', {
          body: { gameId }
        });

        if (error) throw error;
        setSummary(data.analysis);
      }

      // Auto-generate highlight after analysis
      try {
        await supabase.functions.invoke('generate-game-highlight', {
          body: { gameId },
        });
      } catch (highlightError) {
        console.error('Error generating highlight:', highlightError);
        // Don't show error to user - highlights are optional
      }
    } catch (error) {
      console.error("Error fetching game summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Game Over</DialogTitle>
        </DialogHeader>

        {/* Game Result with Both Players */}
        {whitePlayer && blackPlayer && (
          <Card className="gradient-card p-6 mb-4 animate-scale-in">
            <div className="space-y-6">
              {/* Result Title */}
              <div className="text-center">
                <h3 className="text-3xl font-bold mb-2">
                  {winnerId === null ? (
                    <span className="text-muted-foreground">Draw</span>
                  ) : winnerId === whitePlayer.id ? (
                    <span className="text-foreground">White Wins!</span>
                  ) : (
                    <span className="text-foreground">Black Wins!</span>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground capitalize">
                  by {result.replace('_', ' ')}
                </p>
              </div>

              {/* Both Players Rating Changes */}
              <div className="grid grid-cols-2 gap-6">
                {/* White Player */}
                <div className={`flex flex-col items-center p-4 rounded-lg border-2 ${
                  winnerId === whitePlayer.id 
                    ? 'border-green-500 bg-green-500/10' 
                    : winnerId === null 
                    ? 'border-muted' 
                    : 'border-red-500/50 bg-red-500/5'
                }`}>
                  {winnerId === whitePlayer.id && (
                    <Trophy className="w-8 h-8 text-green-500 mb-2 animate-bounce" />
                  )}
                  <div className="text-center mb-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">White</p>
                    <p className="font-bold text-lg truncate max-w-[150px]">
                      {whitePlayer.display_name || whitePlayer.username}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`text-2xl font-bold ${
                        whitePlayer.ratingChange >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {whitePlayer.ratingChange >= 0 ? '+' : ''}{whitePlayer.ratingChange}
                      </span>
                      {whitePlayer.ratingChange >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {whitePlayer.oldRating} → <span className="font-bold">{whitePlayer.newRating}</span>
                    </p>
                  </div>
                </div>

                {/* Black Player */}
                <div className={`flex flex-col items-center p-4 rounded-lg border-2 ${
                  winnerId === blackPlayer.id 
                    ? 'border-green-500 bg-green-500/10' 
                    : winnerId === null 
                    ? 'border-muted' 
                    : 'border-red-500/50 bg-red-500/5'
                }`}>
                  {winnerId === blackPlayer.id && (
                    <Trophy className="w-8 h-8 text-green-500 mb-2 animate-bounce" />
                  )}
                  <div className="text-center mb-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Black</p>
                    <p className="font-bold text-lg truncate max-w-[150px]">
                      {blackPlayer.display_name || blackPlayer.username}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`text-2xl font-bold ${
                        blackPlayer.ratingChange >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {blackPlayer.ratingChange >= 0 ? '+' : ''}{blackPlayer.ratingChange}
                      </span>
                      {blackPlayer.ratingChange >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {blackPlayer.oldRating} → <span className="font-bold">{blackPlayer.newRating}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3">Analyzing your game...</span>
          </div>
        ) : summary ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Overall Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{summary.overall_rating}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {summary.strengths.map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span className="text-sm">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-orange-500" />
                    Areas to Improve
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {summary.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-orange-500 mt-1">•</span>
                        <span className="text-sm">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {summary.key_moments && summary.key_moments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Key Moments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summary.key_moments.map((moment, idx) => (
                      <div key={idx} className="border-l-2 border-primary pl-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            {moment.move}
                          </Badge>
                          <Badge className="text-xs capitalize">
                            {moment.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{moment.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Suggestions for Next Game
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{summary.suggestions}</p>
              </CardContent>
            </Card>

            {/* What's next section */}
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold text-center mb-4">What's next?</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  {onRequestRematch && (
                    <Button
                      onClick={() => {
                        onRequestRematch();
                        onOpenChange(false);
                      }}
                      className="flex-1 h-12"
                      size="lg"
                    >
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Request Rematch
                    </Button>
                  )}
                  {onFindNewMatch && (
                    <Button
                      onClick={() => {
                        onFindNewMatch();
                        onOpenChange(false);
                      }}
                      variant="outline"
                      className="flex-1 h-12"
                      size="lg"
                    >
                      <Search className="w-5 h-5 mr-2" />
                      Find New Match
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
              Close Summary
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Unable to generate game summary</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
