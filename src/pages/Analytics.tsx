import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, Trophy, Target, Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface GameHistory {
  id: string;
  result: string;
  total_moves: number;
  created_at: string;
  winner_id: string | null;
}

interface PlayerStats {
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
}

interface GameAnalysis {
  game_id: string;
  strengths: string[];
  weaknesses: string[];
  key_moments: Array<{ move_number: number; description: string }>;
  overall_rating: string;
  suggestions: string;
  created_at: string;
}

const Analytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [analyses, setAnalyses] = useState<GameAnalysis[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchStats(user.id);
      fetchGameHistory(user.id);
      fetchAnalyses(user.id);
    });
  }, []);

  const fetchStats = async (userId: string) => {
    const { data, error } = await supabase
      .from("player_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching stats:", error);
      return;
    }

    setStats(data || {
      total_games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      win_rate: 0,
    });
  };

  const fetchGameHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from("game_history")
      .select("*")
      .or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching game history:", error);
      return;
    }

    setGameHistory(data || []);
  };

  const fetchAnalyses = async (userId: string) => {
    const { data, error } = await supabase
      .from("game_analysis")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching analyses:", error);
      return;
    }

    setAnalyses((data || []).map(item => ({
      ...item,
      strengths: item.strengths as unknown as string[],
      weaknesses: item.weaknesses as unknown as string[],
      key_moments: item.key_moments as unknown as Array<{ move_number: number; description: string }>,
    })));
  };

  const analyzeGame = async (gameId: string) => {
    setIsAnalyzing(true);
    setSelectedGame(gameId);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-game", {
        body: { gameId },
      });

      if (error) throw error;

      toast.success("Game analyzed successfully!");
      if (user) {
        fetchAnalyses(user.id);
      }
    } catch (error: any) {
      console.error("Error analyzing game:", error);
      toast.error(error.message || "Failed to analyze game");
    } finally {
      setIsAnalyzing(false);
      setSelectedGame(null);
    }
  };

  const pieData = stats
    ? [
        { name: "Wins", value: stats.wins, color: "hsl(var(--success))" },
        { name: "Losses", value: stats.losses, color: "hsl(var(--destructive))" },
        { name: "Draws", value: stats.draws, color: "hsl(var(--muted))" },
      ]
    : [];

  const performanceData = gameHistory.slice(0, 10).reverse().map((game, index) => ({
    game: index + 1,
    result: game.winner_id === user?.id ? 1 : game.winner_id === null ? 0.5 : 0,
  }));

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="secondary" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Deep Analytics</h1>
          <div className="w-24"></div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="gradient-card p-6">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Games</p>
                <p className="text-2xl font-bold">{stats?.total_games || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="gradient-card p-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Wins</p>
                <p className="text-2xl font-bold">{stats?.wins || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="gradient-card p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{stats?.win_rate || 0}%</p>
              </div>
            </div>
          </Card>
          <Card className="gradient-card p-6">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-gold" />
              <div>
                <p className="text-sm text-muted-foreground">AI Analyses</p>
                <p className="text-2xl font-bold">{analyses.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Performance Chart */}
          <Card className="gradient-card p-6">
            <h3 className="text-xl font-bold mb-4">Recent Performance</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="game"
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: "Game Number", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  domain={[0, 1]}
                  ticks={[0, 0.5, 1]}
                  tickFormatter={(value) => ["Loss", "Draw", "Win"][value * 2]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="result"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Win Distribution */}
          <Card className="gradient-card p-6">
            <h3 className="text-xl font-bold mb-4">Win Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Recent Games */}
        <Card className="gradient-card p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Recent Games</h3>
          <div className="space-y-3">
            {gameHistory.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No games played yet</p>
            ) : (
              gameHistory.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-4 rounded bg-muted/30"
                >
                  <div>
                    <p className="font-medium capitalize">{game.result.replace("_", " ")}</p>
                    <p className="text-sm text-muted-foreground">
                      {game.total_moves} moves • {new Date(game.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => analyzeGame(game.id)}
                    disabled={isAnalyzing && selectedGame === game.id}
                  >
                    {isAnalyzing && selectedGame === game.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze"
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* AI Insights */}
        <Card className="gradient-card p-6">
          <h3 className="text-xl font-bold mb-4">AI Insights</h3>
          {analyses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No analyses yet. Click "Analyze" on a game above to get AI-powered insights!
            </p>
          ) : (
            <div className="space-y-6">
              {analyses.map((analysis) => (
                <div key={analysis.game_id} className="border-t border-border pt-6 first:border-t-0 first:pt-0">
                  <div className="mb-4">
                    <p className="text-lg font-semibold text-primary">{analysis.overall_rating}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-success mb-2">✓ Strengths</h4>
                      <ul className="space-y-1 text-sm">
                        {analysis.strengths.map((strength, idx) => (
                          <li key={idx} className="text-muted-foreground">• {strength}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-destructive mb-2">✗ Weaknesses</h4>
                      <ul className="space-y-1 text-sm">
                        {analysis.weaknesses.map((weakness, idx) => (
                          <li key={idx} className="text-muted-foreground">• {weakness}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Key Moments</h4>
                    <div className="space-y-2">
                      {analysis.key_moments.map((moment, idx) => (
                        <div key={idx} className="text-sm bg-muted/20 p-3 rounded">
                          <span className="font-mono text-primary">Move {moment.move_number}:</span>{" "}
                          <span className="text-muted-foreground">{moment.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Suggestions</h4>
                    <p className="text-sm text-muted-foreground">{analysis.suggestions}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
