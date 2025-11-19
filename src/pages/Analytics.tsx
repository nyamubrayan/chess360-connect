import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Home, TrendingUp, TrendingDown, Target, Lightbulb, Trophy, AlertCircle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { GameHistory } from "@/components/GameHistory";

interface PlayerStats {
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
}

interface GameAnalysis {
  created_at: string;
  strengths: any;
  weaknesses: any;
  overall_rating: string;
  suggestions: string;
}

export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [analyses, setAnalyses] = useState<GameAnalysis[]>([]);
  const [user, setUser] = useState<any>(null);
  const [completedLessonsCount, setCompletedLessonsCount] = useState(0);

  useEffect(() => {
    fetchUserAndData();
  }, []);

  const fetchUserAndData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);

      // Fetch player stats
      const { data: statsData } = await supabase
        .from("player_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setStats(statsData);

      // Fetch game analyses
      const { data: analysesData } = await supabase
        .from("game_analysis")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setAnalyses(analysesData || []);
      
      // Fetch completed lessons count
      const { data: progressData } = await supabase
        .from("lesson_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("progress", 100);

      setCompletedLessonsCount(progressData?.length || 0);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate strengths and weaknesses
  const strengthsMap = new Map<string, number>();
  const weaknessesMap = new Map<string, number>();

  analyses.forEach((analysis) => {
    const strengths = Array.isArray(analysis.strengths) ? analysis.strengths : [];
    const weaknesses = Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [];
    
    strengths.forEach((strength: string) => {
      strengthsMap.set(strength, (strengthsMap.get(strength) || 0) + 1);
    });
    weaknesses.forEach((weakness: string) => {
      weaknessesMap.set(weakness, (weaknessesMap.get(weakness) || 0) + 1);
    });
  });

  const topStrengths = Array.from(strengthsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topWeaknesses = Array.from(weaknessesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Performance trend data
  const trendData = analyses.slice(0, 7).reverse().map((analysis, index) => ({
    game: `Game ${index + 1}`,
    rating: analysis.overall_rating?.includes("excellent") || analysis.overall_rating?.includes("strong") ? 4 :
            analysis.overall_rating?.includes("good") || analysis.overall_rating?.includes("solid") ? 3 :
            analysis.overall_rating?.includes("decent") || analysis.overall_rating?.includes("average") ? 2 : 1,
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Deep Analytics
            </h1>
            <p className="text-muted-foreground mt-2">Track your performance and improvement over time</p>
          </div>
          <Button onClick={() => navigate("/")} variant="outline" size="lg">
            <Home className="mr-2 h-5 w-5" />
            Home
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="gradient-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Games</p>
                <p className="text-3xl font-bold mt-1">{stats?.total_games || 0}</p>
              </div>
              <Trophy className="h-8 w-8 text-primary opacity-50" />
            </div>
          </Card>

          <Card className="gradient-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-3xl font-bold mt-1 text-green-500">{stats?.win_rate?.toFixed(1) || 0}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </Card>

          <Card className="gradient-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Wins</p>
                <p className="text-3xl font-bold mt-1 text-blue-500">{stats?.wins || 0}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </Card>

          <Card className="gradient-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Losses</p>
                <p className="text-3xl font-bold mt-1 text-red-500">{stats?.losses || 0}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </Card>

          <Card className="gradient-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lessons Done</p>
                <p className="text-3xl font-bold mt-1 text-purple-500">{completedLessonsCount}</p>
              </div>
              <Lightbulb className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Performance Trend */}
        {trendData.length > 0 && (
          <Card className="gradient-card p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Performance Trend (Last 7 Games)
            </h2>
            <ChartContainer config={{ rating: { label: "Performance", color: "hsl(var(--primary))" } }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="game" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" domain={[0, 5]} ticks={[1, 2, 3, 4]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="rating" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>
        )}

        {/* Strengths and Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Strengths */}
          <Card className="gradient-card p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-green-500">
              <Trophy className="h-6 w-6" />
              Top Strengths
            </h2>
            {topStrengths.length > 0 ? (
              <div className="space-y-3">
                {topStrengths.map(([strength, count], index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                    <p className="text-sm">{strength}</p>
                    <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full font-medium">
                      {count} times
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Play more games to see your strengths!</p>
            )}
          </Card>

          {/* Areas for Improvement */}
          <Card className="gradient-card p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-orange-500">
              <AlertCircle className="h-6 w-6" />
              Areas for Improvement
            </h2>
            {topWeaknesses.length > 0 ? (
              <div className="space-y-3">
                {topWeaknesses.map(([weakness, count], index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                    <p className="text-sm">{weakness}</p>
                    <span className="text-xs bg-orange-500/20 text-orange-500 px-2 py-1 rounded-full font-medium">
                      {count} times
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Play more games to identify areas for improvement!</p>
            )}
          </Card>
        </div>

        {/* Recent Game Insights */}
        {analyses.length > 0 && (
          <Card className="gradient-card p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              Recent Game Insights
            </h2>
            <div className="space-y-4">
              {analyses.slice(0, 3).map((analysis, index) => (
                <div key={index} className="p-4 bg-accent/20 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </p>
                    <span className="text-xs font-medium text-primary">{analysis.overall_rating}</span>
                  </div>
                  {analysis.suggestions && (
                    <p className="text-sm">{analysis.suggestions}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {analyses.length === 0 && (
          <Card className="gradient-card p-12 text-center">
            <Lightbulb className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold mb-2">No Analytics Yet</h3>
            <p className="text-muted-foreground mb-4">
              Play games with AI Mentor Mode enabled to start tracking your progress!
            </p>
            <Button onClick={() => navigate("/lobby")}>Start Playing</Button>
          </Card>
        )}

        {/* Game History with Analysis */}
        {user && <GameHistory userId={user.id} limit={20} showAnalyzeButton={true} />}
      </div>
    </div>
  );
}
