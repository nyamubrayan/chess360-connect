import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Award } from "lucide-react";

interface PlayerWithStats {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  rating: number | null;
  player_stats: {
    total_games: number;
    wins: number;
    win_rate: number;
  } | null;
  leaderboard_stats: {
    tournaments_won: number;
  } | null;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        *,
        player_stats (
          total_games,
          wins,
          win_rate
        ),
        leaderboard_stats (
          tournaments_won
        )
      `
      )
      .order("rating", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching leaderboard:", error);
    } else {
      const formattedData = (data || []).map((p: any) => ({
        ...p,
        player_stats: Array.isArray(p.player_stats) ? p.player_stats[0] : p.player_stats,
        leaderboard_stats: Array.isArray(p.leaderboard_stats) ? p.leaderboard_stats[0] : p.leaderboard_stats,
      }));
      setPlayers(formattedData);
    }
    setLoading(false);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Trophy className="w-5 h-5 text-amber-600" />;
    return <span className="text-muted-foreground">#{index + 1}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading leaderboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="w-8 h-8" />
            Leaderboard
          </h1>
          <Button variant="outline" onClick={() => navigate("/")}>
            ← Home
          </Button>
        </div>

        <Tabs defaultValue="rating" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rating">
              <TrendingUp className="w-4 h-4 mr-2" />
              By Rating
            </TabsTrigger>
            <TabsTrigger value="tournaments">
              <Award className="w-4 h-4 mr-2" />
              By Tournaments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rating" className="space-y-3">
            {players.map((player, index) => (
              <Card
                key={player.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/profile/${player.id}`)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-12 text-center font-bold">
                    {getRankIcon(index)}
                  </div>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={player.avatar_url || undefined} />
                    <AvatarFallback>
                      {player.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {player.display_name || player.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{player.username}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="default" className="text-lg px-3 py-1">
                      {player.rating || 1200}
                    </Badge>
                    {player.player_stats && (
                      <p className="text-xs text-muted-foreground">
                        {player.player_stats.wins}/{player.player_stats.total_games} wins
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-3">
            {[...players]
              .sort(
                (a, b) =>
                  (b.leaderboard_stats?.tournaments_won || 0) -
                  (a.leaderboard_stats?.tournaments_won || 0)
              )
              .map((player, index) => (
                <Card
                  key={player.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/profile/${player.id}`)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="w-12 text-center font-bold">
                      {getRankIcon(index)}
                    </div>
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={player.avatar_url || undefined} />
                      <AvatarFallback>
                        {player.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {player.display_name || player.username}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{player.username}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        <Trophy className="w-4 h-4 mr-1 inline" />
                        {player.leaderboard_stats?.tournaments_won || 0}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        tournaments won
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Leaderboard;
