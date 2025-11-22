import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, Gamepad2, Trophy, BookOpen, Brain } from "lucide-react";

interface Stats {
  onlinePlayers: number;
  totalPlayers: number;
  activeGames: number;
  totalGames: number;
  availableLessons: number;
  puzzlesSolved: number;
}

export const Footer = () => {
  const [stats, setStats] = useState<Stats>({
    onlinePlayers: 0,
    totalPlayers: 0,
    activeGames: 0,
    totalGames: 0,
    availableLessons: 0,
    puzzlesSolved: 0,
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

        // Fetch total puzzles solved
        const { count: puzzlesSolved } = await supabase
          .from('user_puzzle_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('solved', true);

        setStats({
          onlinePlayers: 0, // Will be updated by presence
          totalPlayers: totalPlayers || 0,
          activeGames: activeGames || 0,
          totalGames: totalGames || 0,
          availableLessons: (puzzlesCount || 0) + (achievementsCount || 0),
          puzzlesSolved: puzzlesSolved || 0,
        });
      } catch (error) {
        console.error('Error fetching statistics:', error);
      }
    };

    fetchStatistics();

    // Set up realtime tracking for online players
    const presenceChannel = supabase.channel('online-users-footer');
    
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

  const statsData = [
    {
      icon: Users,
      value: `${stats.onlinePlayers}+`,
      label: 'Players Online',
      color: 'text-green-400'
    },
    {
      icon: TrendingUp,
      value: `${stats.totalPlayers}+`,
      label: 'Registered Players',
      color: 'text-blue-400'
    },
    {
      icon: Gamepad2,
      value: `${stats.activeGames}+`,
      label: 'Active Games',
      color: 'text-purple-400'
    },
    {
      icon: Trophy,
      value: `${stats.totalGames}+`,
      label: 'Games Played',
      color: 'text-orange-400'
    },
    {
      icon: BookOpen,
      value: `${stats.availableLessons}+`,
      label: 'Lessons Available',
      color: 'text-pink-400'
    },
    {
      icon: Brain,
      value: `${stats.puzzlesSolved}+`,
      label: 'Puzzles Solved',
      color: 'text-cyan-400'
    }
  ];

  return (
    <footer className="py-16 px-4 bg-gradient-to-b from-background to-background/80 border-t border-border/40">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index} 
                className="p-4 lg:p-6 text-center bg-card/40 backdrop-blur-sm border-border/20 hover:border-primary/20 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <div className={`${stat.color} opacity-80`}>
                      <Icon className="w-8 h-8 lg:w-10 lg:h-10" />
                    </div>
                  </div>
                  <div className={`text-2xl lg:text-3xl font-bold ${stat.color}`}>
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
        
        <div className="mt-12 pt-8 border-t border-border/20 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Chessafari. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};