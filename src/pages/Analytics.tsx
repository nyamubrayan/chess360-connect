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

interface GameRatingHistory {
  game_number: number;
  rating: number;
  result: string;
  completed_at: string;
  white_rating_change: number | null;
  black_rating_change: number | null;
  is_white: boolean;
}

export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [analyses, setAnalyses] = useState<GameAnalysis[]>([]);
  const [user, setUser] = useState<any>(null);
  const [ratingHistory, setRatingHistory] = useState<GameRatingHistory[]>([]);

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

      // Fetch rating history from all completed games
      const { data: gamesData } = await supabase
        .from("games")
        .select(`
          completed_at,
          result,
          white_player_id,
          black_player_id,
          white_rating_change,
          black_rating_change
        `)
        .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
        .eq("status", "completed")
        .order("completed_at", { ascending: true });

      if (gamesData) {
        // Get initial rating
        const { data: profile } = await supabase
          .from("profiles")
          .select("rating")
          .eq("id", user.id)
          .single();

        const initialRating = 1200; // Starting rating
        const currentRating = profile?.rating || 1200;

        // Calculate rating progression
        let cumulativeRating = initialRating;
        const history: GameRatingHistory[] = [];

        // Work backwards from current rating
        const reversedGames = [...gamesData].reverse();
        let workingRating = currentRating;

        reversedGames.forEach((game) => {
          const isWhite = game.white_player_id === user.id;
          const ratingChange = isWhite ? game.white_rating_change : game.black_rating_change;
          
          // Current game shows the rating AFTER the game
          history.unshift({
            game_number: history.length + 1,
            rating: workingRating,
            result: game.result || "draw",
            completed_at: game.completed_at || "",
            white_rating_change: game.white_rating_change,
            black_rating_change: game.black_rating_change,
            is_white: isWhite
          });

          // Subtract the rating change to get the rating before this game
          workingRating -= (ratingChange || 0);
        });

        // Reverse to chronological order and renumber
        const chronologicalHistory = history.reverse().map((h, idx) => ({
          ...h,
          game_number: idx + 1
        }));

        setRatingHistory(chronologicalHistory);
      }
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

  // Rating progression data for chart
  const ratingChartData = ratingHistory.map((h) => ({
    game: `Game ${h.game_number}`,
    rating: h.rating,
    gameNumber: h.game_number
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Deep Analytics
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Track your performance and improvement over time</p>
          </div>
          <Button onClick={() => navigate("/")} variant="outline" size="default" className="w-full sm:w-auto">
            <Home className="mr-2 h-4 w-4" />
            Home
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="gradient-card p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Games</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1">{stats?.total_games || 0}</p>
              </div>
              <Trophy className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary opacity-50 flex-shrink-0" />
            </div>
          </Card>

          <Card className="gradient-card p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Win Rate</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 text-green-500">{stats?.win_rate?.toFixed(1) || 0}%</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-green-500 opacity-50 flex-shrink-0" />
            </div>
          </Card>

          <Card className="gradient-card p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Wins</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 text-blue-500">{stats?.wins || 0}</p>
              </div>
              <Target className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-500 opacity-50 flex-shrink-0" />
            </div>
          </Card>

          <Card className="gradient-card p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Losses</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 text-red-500">{stats?.losses || 0}</p>
              </div>
              <TrendingDown className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-red-500 opacity-50 flex-shrink-0" />
            </div>
          </Card>

        </div>

        {/* Rating Progression */}
        {ratingChartData.length > 0 && (
          <Card className="gradient-card p-4 sm:p-5 lg:p-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Rating Progress (All Games)
            </h2>
            <ChartContainer config={{ rating: { label: "Rating", color: "hsl(var(--primary))" } }}>
              <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                <LineChart data={ratingChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="game" 
                    stroke="hsl(var(--foreground))"
                    label={{ value: 'Game Number', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))"
                    label={{ value: 'Rating', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border border-border p-2 rounded-lg shadow-lg">
                            <p className="text-sm font-semibold">{payload[0].payload.game}</p>
                            <p className="text-sm">Rating: {payload[0].value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rating" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3} 
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>
        )}

        {/* Strengths and Weaknesses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
          {/* Top Strengths */}
          <Card className="gradient-card p-4 sm:p-5 lg:p-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2 text-green-500">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
              Top Strengths
            </h2>
            {topStrengths.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {topStrengths.map(([strength, count], index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 sm:p-3 bg-accent/20 rounded-lg">
                    <p className="text-xs sm:text-sm flex-1 min-w-0 pr-2">{strength}</p>
                    <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                      {count} times
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">Play more games to see your strengths!</p>
            )}
          </Card>

          {/* Areas for Improvement */}
          <Card className="gradient-card p-4 sm:p-5 lg:p-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2 text-orange-500">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              Areas for Improvement
            </h2>
            {topWeaknesses.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {topWeaknesses.map(([weakness, count], index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 sm:p-3 bg-accent/20 rounded-lg">
                    <p className="text-xs sm:text-sm flex-1 min-w-0 pr-2">{weakness}</p>
                    <span className="text-xs bg-orange-500/20 text-orange-500 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                      {count} times
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">Play more games to identify areas for improvement!</p>
            )}
          </Card>
        </div>

        {/* Recent Game Insights */}
        {analyses.length > 0 && (
          <Card className="gradient-card p-4 sm:p-5 lg:p-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Recent Game Insights
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {analyses.slice(0, 3).map((analysis, index) => (
                <div key={index} className="p-3 sm:p-4 bg-accent/20 rounded-lg space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </p>
                    <span className="text-xs font-medium text-primary whitespace-nowrap">{analysis.overall_rating}</span>
                  </div>
                  {analysis.suggestions && (
                    <p className="text-xs sm:text-sm">{analysis.suggestions}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {analyses.length === 0 && (
          <Card className="gradient-card p-8 sm:p-10 lg:p-12 text-center">
            <Lightbulb className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-bold mb-2">No Analytics Yet</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Play games with AI Mentor Mode enabled to start tracking your progress!
            </p>
            <Button onClick={() => navigate("/lobby")} size="default">Start Playing</Button>
          </Card>
        )}

        {/* Game History with Analysis */}
        {user && <GameHistory userId={user.id} limit={20} showAnalyzeButton={true} />}
      </div>
    </div>
  );
}
