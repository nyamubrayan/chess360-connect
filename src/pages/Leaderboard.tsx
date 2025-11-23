import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Star, Award, Medal, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  user_training_stats: {
    total_puzzles_solved: number;
  } | null;
}

type LeaderboardCategory = "rating" | "games" | "puzzles";

const Leaderboard = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [category, setCategory] = useState<LeaderboardCategory>("rating");

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

  useEffect(() => {
    if (user) {
      fetchLeaderboard();
    }
  }, [category, user]);

  // Real-time updates for leaderboard
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchLeaderboard();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_stats'
        },
        () => {
          fetchLeaderboard();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_training_stats'
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, category]);

  const fetchLeaderboard = async () => {
    // Fetch all data without server-side ordering since Supabase doesn't support ordering by nested relations
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
        user_training_stats (
          total_puzzles_solved
        )
      `
      )
      .limit(200); // Fetch more data to ensure we have enough after sorting

    if (error) {
      console.error("Error fetching leaderboard:", error);
      setLoading(false);
      return;
    }

    // Format the data
    const formattedData = (data || []).map((p: any) => ({
      ...p,
      player_stats: Array.isArray(p.player_stats) ? p.player_stats[0] : p.player_stats,
      user_training_stats: Array.isArray(p.user_training_stats) ? p.user_training_stats[0] : p.user_training_stats,
    }));

    // Sort data based on category on the client side
    let sortedData = [...formattedData];
    
    if (category === "rating") {
      sortedData.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (category === "games") {
      sortedData.sort((a, b) => {
        const aGames = a.player_stats?.total_games || 0;
        const bGames = b.player_stats?.total_games || 0;
        return bGames - aGames;
      });
    } else if (category === "puzzles") {
      sortedData.sort((a, b) => {
        const aPuzzles = a.user_training_stats?.total_puzzles_solved || 0;
        const bPuzzles = b.user_training_stats?.total_puzzles_solved || 0;
        return bPuzzles - aPuzzles;
      });
    }

    // Take top 50
    setPlayers(sortedData.slice(0, 50));
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

  const getCategoryValue = (player: PlayerWithStats) => {
    if (category === "rating") return player.rating?.toLocaleString() || '1,200';
    if (category === "games") return player.player_stats?.total_games?.toLocaleString() || '0';
    if (category === "puzzles") return player.user_training_stats?.total_puzzles_solved?.toLocaleString() || '0';
    return '0';
  };

  const getCategoryLabel = () => {
    if (category === "rating") return "Rating";
    if (category === "games") return "Games";
    if (category === "puzzles") return "Puzzles";
    return "";
  };

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

        {/* Category Tabs */}
        <Tabs value={category} onValueChange={(v) => setCategory(v as LeaderboardCategory)} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="rating">Rating</TabsTrigger>
            <TabsTrigger value="games">Games Played</TabsTrigger>
            <TabsTrigger value="puzzles">Puzzles Solved</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Podium - Top 3 */}
        {topThree.length >= 3 && (
          <motion.div 
            className="grid grid-cols-3 gap-2 sm:gap-4 items-end mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* 2nd Place - Left */}
            <motion.div 
              className="flex flex-col items-center"
              layout
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-3 ${getPodiumIconBg(2)}`}>
                <Crown className={`w-8 h-8 sm:w-10 sm:h-10 ${getPodiumIconColor(2)}`} />
              </div>
              <Card className="w-full bg-gradient-to-br from-cyan-50/50 to-cyan-100/50 border-cyan-200 p-3 sm:p-4 text-center">
                <p className="font-semibold text-sm sm:text-base truncate">
                  {topThree[1]?.display_name || topThree[1]?.username}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-cyan-600 mt-1">
                  {getCategoryValue(topThree[1])}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{getCategoryLabel()}</p>
              </Card>
            </motion.div>

            {/* 1st Place - Center (Elevated) */}
            <motion.div 
              className="flex flex-col items-center -mt-6 sm:-mt-8"
              layout
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-3 ${getPodiumIconBg(1)}`}>
                <Crown className={`w-10 h-10 sm:w-12 sm:h-12 ${getPodiumIconColor(1)}`} />
              </div>
              <Card className="w-full bg-gradient-to-br from-rose-50/50 to-pink-100/50 border-rose-200 p-4 sm:p-6 text-center shadow-lg">
                <p className="font-bold text-base sm:text-lg truncate">
                  {topThree[0]?.display_name || topThree[0]?.username}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-rose-600 mt-2">
                  {getCategoryValue(topThree[0])}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{getCategoryLabel()}</p>
              </Card>
            </motion.div>

            {/* 3rd Place - Right */}
            <motion.div 
              className="flex flex-col items-center"
              layout
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-3 ${getPodiumIconBg(3)}`}>
                <Medal className={`w-8 h-8 sm:w-10 sm:h-10 ${getPodiumIconColor(3)}`} />
              </div>
              <Card className="w-full bg-gradient-to-br from-blue-50/50 to-indigo-100/50 border-blue-200 p-3 sm:p-4 text-center">
                <p className="font-semibold text-sm sm:text-base truncate">
                  {topThree[2]?.display_name || topThree[2]?.username}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
                  {getCategoryValue(topThree[2])}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{getCategoryLabel()}</p>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Rest of Leaderboard */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {restOfPlayers.map((player, index) => {
              const position = index + 4;
              return (
                <motion.div
                  key={player.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 30,
                    delay: index * 0.02
                  }}
                >
                  <Card
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
                      
                      <div className="text-right">
                        <p className="font-bold text-base sm:text-lg">
                          {getCategoryValue(player)}
                        </p>
                        <p className="text-xs text-muted-foreground">{getCategoryLabel()}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
