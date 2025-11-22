import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Users, TrendingUp, Gamepad2, Trophy, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Statistic {
  icon: typeof Users;
  value: string;
  label: string;
  color: string;
}

export const StatisticsSection = () => {
  const [stats, setStats] = useState({
    onlinePlayers: 0,
    totalPlayers: 0,
    activeGames: 0,
    totalGames: 0,
    availableLessons: 0,
  });

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        // Fetch total registered players
        const { count: totalPlayers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch active games
        const { count: activeGames } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // Fetch total games played
        const { count: totalGames } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');

        // Count available lessons (puzzles + training achievements)
        const { count: puzzlesCount } = await supabase
          .from('puzzles')
          .select('*', { count: 'exact', head: true });

        const { count: achievementsCount } = await supabase
          .from('training_achievements')
          .select('*', { count: 'exact', head: true });

        setStats({
          onlinePlayers: 0, // Will be updated by presence
          totalPlayers: totalPlayers || 0,
          activeGames: activeGames || 0,
          totalGames: totalGames || 0,
          availableLessons: (puzzlesCount || 0) + (achievementsCount || 0),
        });
      } catch (error) {
        console.error('Error fetching statistics:', error);
      }
    };

    fetchStatistics();

    // Set up realtime tracking for online players
    const presenceChannel = supabase.channel('online-users');
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineCount = Object.keys(state).length;
        setStats(prev => ({ ...prev, onlinePlayers: onlineCount }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await presenceChannel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            });
          }
        }
      });

    // Refresh stats periodically
    const interval = setInterval(fetchStatistics, 30000); // Every 30 seconds

    return () => {
      presenceChannel.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const statistics: Statistic[] = [
    {
      icon: Users,
      value: `${stats.onlinePlayers}+`,
      label: "Players Online",
      color: "text-green-500",
    },
    {
      icon: TrendingUp,
      value: `${stats.totalPlayers}+`,
      label: "Registered Players",
      color: "text-blue-500",
    },
    {
      icon: Gamepad2,
      value: `${stats.activeGames}+`,
      label: "Active Games",
      color: "text-purple-500",
    },
    {
      icon: Trophy,
      value: `${stats.totalGames.toLocaleString()}+`,
      label: "Games Played",
      color: "text-orange-500",
    },
    {
      icon: BookOpen,
      value: `${stats.availableLessons}+`,
      label: "Lessons Available",
      color: "text-pink-500",
    },
  ];

  return (
    <section className="py-12 px-4 bg-card/50 border-y border-border">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
          {statistics.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={index}
                className="p-4 lg:p-6 text-center border-2 hover:border-primary/30 transition-all duration-300 bg-gradient-to-br from-card to-muted/20"
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className={`${stat.color} opacity-80`}>
                    <Icon className="w-8 h-8 lg:w-10 lg:h-10" />
                  </div>
                  <div className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-xs lg:text-sm text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
