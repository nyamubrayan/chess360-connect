import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Lightbulb, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIMentorPanelProps {
  currentFen: string;
  lastMove: string | null;
  playerColor: "white" | "black" | null;
  isActive: boolean;
}

interface MoveAnalysis {
  evaluation: string;
  suggestion: string;
  explanation: string;
  type: "good" | "questionable" | "mistake" | "blunder";
}

export const AIMentorPanel = ({ currentFen, lastMove, playerColor, isActive }: AIMentorPanelProps) => {
  const [analysis, setAnalysis] = useState<MoveAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  useEffect(() => {
    if (isActive && lastMove && currentFen) {
      analyzeMoveInRealTime();
    }
  }, [lastMove, currentFen, isActive]);

  const analyzeMoveInRealTime = async () => {
    setIsAnalyzing(true);
    setMoveCount(prev => prev + 1);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-move', {
        body: {
          fen: currentFen,
          lastMove: lastMove,
          playerColor: playerColor,
        },
      });

      if (error) throw error;

      setAnalysis(data.analysis);
    } catch (error: any) {
      console.error('Error analyzing move:', error);
      // Don't show error toast to avoid disrupting gameplay
    } finally {
      setIsAnalyzing(false);
    }
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

  if (!isActive) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="pt-6 text-center">
          <Brain className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            AI Mentor is disabled
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Mentor
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            Move {moveCount}
          </Badge>
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

            <div className="space-y-2">
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
                    Suggestion
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
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Make a move to see AI analysis
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
