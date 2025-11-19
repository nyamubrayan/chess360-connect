import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, TrendingDown, Target, Lightbulb, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PostGameSummaryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  result: string;
  playerColor: "white" | "black";
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

export const PostGameSummary = ({ open, onOpenChange, gameId, result, playerColor }: PostGameSummaryProps) => {
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && gameId) {
      fetchOrGenerateSummary();
    }
  }, [open, gameId]);

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

  const getResultBadge = () => {
    if (result === "draw") {
      return <Badge variant="secondary">Draw</Badge>;
    }
    const won = (result === "white_win" && playerColor === "white") || 
                (result === "black_win" && playerColor === "black");
    return won ? (
      <Badge className="bg-green-500/10 text-green-500">Victory</Badge>
    ) : (
      <Badge className="bg-red-500/10 text-red-500">Defeat</Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Game Summary</DialogTitle>
            {getResultBadge()}
          </div>
        </DialogHeader>

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

            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
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
