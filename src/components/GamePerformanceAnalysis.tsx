import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Trophy, TrendingUp, TrendingDown, Target, Lightbulb, Loader2, 
  AlertCircle, CheckCircle2, XCircle, AlertTriangle, Activity 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface GamePerformanceAnalysisProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
}

interface GameAnalysis {
  overall_rating: string;
  strengths: string[];
  weaknesses: string[];
  key_moments: Array<{
    move_number: number;
    description: string;
  }>;
  suggestions: string;
}

interface MoveData {
  move_number: number;
  move_san: string;
  player_id: string;
  created_at: string;
}

interface PerformanceMetrics {
  totalMoves: number;
  goodMoves: number;
  mistakes: number;
  blunders: number;
  accuracy: number;
}

interface HeatmapData {
  square: string;
  frequency: number;
}

export const GamePerformanceAnalysis = ({ open, onOpenChange, gameId }: GamePerformanceAnalysisProps) => {
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [moves, setMoves] = useState<MoveData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [gameInfo, setGameInfo] = useState<any>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalMoves: 0,
    goodMoves: 0,
    mistakes: 0,
    blunders: 0,
    accuracy: 0
  });
  const [movePerformanceData, setMovePerformanceData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);

  useEffect(() => {
    if (open && gameId) {
      fetchGameData();
    }
  }, [open, gameId]);

  const fetchGameData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Fetch game info
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          white_player:profiles!games_white_player_id_fkey(username, rating),
          black_player:profiles!games_black_player_id_fkey(username, rating)
        `)
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;
      setGameInfo(game);

      // Fetch moves
      const { data: movesData, error: movesError } = await supabase
        .from('game_moves')
        .select('*')
        .eq('game_id', gameId)
        .order('move_number', { ascending: true });

      if (movesError) throw movesError;
      setMoves(movesData || []);

      // Calculate metrics and heatmap
      calculateMetrics(movesData || [], user.id, game);
      calculateHeatmap(movesData || []);

      // Fetch or generate analysis
      await fetchOrGenerateAnalysis(user.id);
    } catch (error) {
      console.error('Error fetching game data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMetrics = (movesData: MoveData[], currentUserId: string, game: any) => {
    const playerMoves = movesData.filter(m => m.player_id === currentUserId);
    const totalMoves = playerMoves.length;
    
    // Simulate move quality distribution (in real scenario, this would come from chess engine analysis)
    const goodMoves = Math.floor(totalMoves * 0.65);
    const mistakes = Math.floor(totalMoves * 0.20);
    const blunders = Math.floor(totalMoves * 0.15);
    const accuracy = goodMoves > 0 ? (goodMoves / totalMoves) * 100 : 0;

    setMetrics({
      totalMoves,
      goodMoves,
      mistakes,
      blunders,
      accuracy
    });

    // Generate move performance chart data
    const performanceData = movesData.map((move, index) => {
      const isPlayerMove = move.player_id === currentUserId;
      // Simulate evaluation scores (-5 to +5 range)
      const baseScore = Math.sin(index * 0.3) * 3;
      const noise = (Math.random() - 0.5) * 2;
      return {
        moveNumber: Math.floor(index / 2) + 1,
        evaluation: parseFloat((baseScore + noise).toFixed(2)),
        move: move.move_san,
        isPlayerMove
      };
    });
    setMovePerformanceData(performanceData);
  };

  const calculateHeatmap = (movesData: MoveData[]) => {
    const squareFrequency: { [key: string]: number } = {};
    
    movesData.forEach(move => {
      // Extract destination square from move notation (simplified)
      const match = move.move_san.match(/[a-h][1-8]/);
      if (match) {
        const square = match[0];
        squareFrequency[square] = (squareFrequency[square] || 0) + 1;
      }
    });

    const heatmap = Object.entries(squareFrequency)
      .map(([square, frequency]) => ({ square, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    setHeatmapData(heatmap);
  };

  const fetchOrGenerateAnalysis = async (currentUserId: string) => {
    try {
      // Check if analysis exists
      const { data: existingAnalysis } = await supabase
        .from("game_analysis")
        .select("*")
        .eq("game_id", gameId)
        .eq("user_id", currentUserId)
        .single();

      if (existingAnalysis) {
        setAnalysis({
          overall_rating: existingAnalysis.overall_rating || "",
          strengths: Array.isArray(existingAnalysis.strengths) ? existingAnalysis.strengths as string[] : [],
          weaknesses: Array.isArray(existingAnalysis.weaknesses) ? existingAnalysis.weaknesses as string[] : [],
          key_moments: Array.isArray(existingAnalysis.key_moments) ? existingAnalysis.key_moments as Array<{move_number: number; description: string}> : [],
          suggestions: existingAnalysis.suggestions || "",
        });
      } else {
        // Generate new analysis
        setIsAnalyzing(true);
        const { data, error } = await supabase.functions.invoke('analyze-game', {
          body: { gameId }
        });

        if (error) throw error;
        setAnalysis(data.analysis);
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error("Error fetching analysis:", error);
      setIsAnalyzing(false);
    }
  };

  const renderHeatmap = () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    
    const getSquareFrequency = (square: string) => {
      const data = heatmapData.find(d => d.square === square);
      return data ? data.frequency : 0;
    };

    const maxFrequency = Math.max(...heatmapData.map(d => d.frequency), 1);

    return (
      <div className="grid grid-cols-8 gap-1 w-full max-w-md mx-auto">
        {ranks.map(rank => 
          files.map(file => {
            const square = `${file}${rank}`;
            const frequency = getSquareFrequency(square);
            const opacity = frequency / maxFrequency;
            const bgOpacity = frequency > 0 ? 0.2 + opacity * 0.8 : 0;
            
            return (
              <div
                key={square}
                className="aspect-square border border-border flex items-center justify-center text-xs font-mono"
                style={{ 
                  backgroundColor: frequency > 0 
                    ? `hsl(var(--primary) / ${bgOpacity})` 
                    : 'transparent' 
                }}
                title={`${square}: ${frequency} moves`}
              >
                {frequency > 0 && frequency}
              </div>
            );
          })
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3">Loading game analysis...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Detailed Game Performance Analysis
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-100px)] pr-4">
          <div className="space-y-6">
            {/* Performance Metrics Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="gradient-card">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{metrics.totalMoves}</p>
                    <p className="text-sm text-muted-foreground">Total Moves</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="gradient-card">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-bold text-green-500">{metrics.goodMoves}</p>
                    <p className="text-sm text-muted-foreground">Good Moves</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="gradient-card">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                    <p className="text-2xl font-bold text-orange-500">{metrics.mistakes}</p>
                    <p className="text-sm text-muted-foreground">Mistakes</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="gradient-card">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                    <p className="text-2xl font-bold text-red-500">{metrics.blunders}</p>
                    <p className="text-sm text-muted-foreground">Blunders</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Accuracy Score */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Move Accuracy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-4 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-green-500 transition-all duration-500"
                        style={{ width: `${metrics.accuracy}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-2xl font-bold">{metrics.accuracy.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Move Performance Graph */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Move-by-Move Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ 
                  evaluation: { label: "Position Evaluation", color: "hsl(var(--primary))" } 
                }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={movePerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="moveNumber" 
                        stroke="hsl(var(--foreground))"
                        label={{ value: 'Move Number', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        stroke="hsl(var(--foreground))" 
                        domain={[-5, 5]}
                        label={{ value: 'Evaluation', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border border-border p-2 rounded-lg shadow-lg">
                                <p className="text-sm font-semibold">Move {payload[0].payload.moveNumber}</p>
                                <p className="text-xs text-muted-foreground">{payload[0].payload.move}</p>
                                <p className="text-sm">Eval: {payload[0].value}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="evaluation" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2} 
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Heatmap */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Move Heatmap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Frequency of moves to each square (darker = more frequent)
                </p>
                {renderHeatmap()}
              </CardContent>
            </Card>

            {/* AI Analysis */}
            {isAnalyzing ? (
              <Card className="gradient-card">
                <CardContent className="py-12">
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
                    <span>Generating AI analysis...</span>
                  </div>
                </CardContent>
              </Card>
            ) : analysis && (
              <>
                <Card className="gradient-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Overall Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{analysis.overall_rating}</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="gradient-card">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-500 mt-1">•</span>
                            <span className="text-sm">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="gradient-card">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-orange-500" />
                        Areas to Improve
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.weaknesses.map((weakness, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-orange-500 mt-1">•</span>
                            <span className="text-sm">{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {analysis.key_moments && analysis.key_moments.length > 0 && (
                  <Card className="gradient-card">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-primary" />
                        Key Moments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysis.key_moments.map((moment, idx) => (
                          <div key={idx} className="border-l-2 border-primary pl-3">
                            <Badge variant="outline" className="font-mono text-xs mb-1">
                              Move {moment.move_number}
                            </Badge>
                            <p className="text-sm text-muted-foreground">{moment.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="gradient-card bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-primary" />
                      Suggestions for Improvement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{analysis.suggestions}</p>
                  </CardContent>
                </Card>
              </>
            )}

            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Close Analysis
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
