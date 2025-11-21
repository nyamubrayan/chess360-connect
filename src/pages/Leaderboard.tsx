import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Star, Award, Medal, ArrowLeft } from "lucide-react";

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
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchLeaderboard();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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

  const getRankIcon = (position: number) => {
    if (position === 1) return <Crown className="w-5 h-5 text-amber-500" />;
    if (position === 2) return <Medal className="w-5 h-5 text-cyan-500" />;
    if (position === 3) return <Award className="w-5 h-5 text-emerald-500" />;
    if (position === 4) return <Star className="w-5 h-5 text-rose-500" />;
    return null;
  };

  const getPodiumIconBg = (position: number) => {
    if (position === 1) return "bg-gradient-to-br from-pink-100 to-rose-100 border-2 border-rose-300";
    if (position === 2) return "bg-gradient-to-br from-amber-50 to-yellow-100 border-2 border-yellow-300";
    if (position === 3) return "bg-gradient-to-br from-cyan-50 to-blue-100 border-2 border-cyan-300";
    return "";
  };

  const getPodiumIconColor = (position: number) => {
    if (position === 1) return "text-rose-600";
    if (position === 2) return "text-amber-600";
    if (position === 3) return "text-cyan-600";
    return "";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading leaderboard...
      </div>
    );
  }

  const topThree = players.slice(0, 3);
  const restOfPlayers = players.slice(3);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl sm:text-4xl font-bold">Leaderboard</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Button>
        </div>

        {/* Podium - Top 3 */}
        {topThree.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end mb-8">
            {/* 2nd Place - Left */}
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-3 ${getPodiumIconBg(2)}`}>
                <Crown className={`w-8 h-8 sm:w-10 sm:h-10 ${getPodiumIconColor(2)}`} />
              </div>
              <Card className="w-full bg-gradient-to-br from-cyan-50/50 to-cyan-100/50 border-cyan-200 p-3 sm:p-4 text-center">
                <p className="font-semibold text-sm sm:text-base truncate">
                  {topThree[1]?.display_name || topThree[1]?.username}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-cyan-600 mt-1">
                  {topThree[1]?.rating?.toLocaleString() || '1,200'}
                </p>
              </Card>
            </div>

            {/* 1st Place - Center (Elevated) */}
            <div className="flex flex-col items-center -mt-6 sm:-mt-8">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-3 ${getPodiumIconBg(1)}`}>
                <Crown className={`w-10 h-10 sm:w-12 sm:h-12 ${getPodiumIconColor(1)}`} />
              </div>
              <Card className="w-full bg-gradient-to-br from-rose-50/50 to-pink-100/50 border-rose-200 p-4 sm:p-6 text-center shadow-lg">
                <p className="font-bold text-base sm:text-lg truncate">
                  {topThree[0]?.display_name || topThree[0]?.username}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-rose-600 mt-2">
                  {topThree[0]?.rating?.toLocaleString() || '1,200'}
                </p>
              </Card>
            </div>

            {/* 3rd Place - Right */}
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-3 ${getPodiumIconBg(3)}`}>
                <Medal className={`w-8 h-8 sm:w-10 sm:h-10 ${getPodiumIconColor(3)}`} />
              </div>
              <Card className="w-full bg-gradient-to-br from-blue-50/50 to-indigo-100/50 border-blue-200 p-3 sm:p-4 text-center">
                <p className="font-semibold text-sm sm:text-base truncate">
                  {topThree[2]?.display_name || topThree[2]?.username}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
                  {topThree[2]?.rating?.toLocaleString() || '1,200'}
                </p>
              </Card>
            </div>
          </div>
        )}

        {/* Rest of Leaderboard */}
        <div className="space-y-2">
          {restOfPlayers.map((player, index) => {
            const position = index + 4;
            return (
              <Card
                key={player.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/profile/${player.id}`)}
              >
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-[60px] sm:min-w-[80px]">
                    <span className="text-base sm:text-lg font-medium text-muted-foreground w-6 sm:w-8">
                      {position}.
                    </span>
                    {getRankIcon(position) && (
                      <div className="flex-shrink-0">
                        {getRankIcon(position)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">
                      {player.display_name || player.username}
                    </p>
                  </div>
                  
                  <div className="font-bold text-base sm:text-lg text-right">
                    {player.rating?.toLocaleString() || '1,200'}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
