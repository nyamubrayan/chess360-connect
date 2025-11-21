import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, BookOpen, Clock } from "lucide-react";

interface Stats {
  activePlayers: number;
  gamesAnalyzed: number;
  aiLessons: number;
}

export const StatsSection = () => {
  const [stats, setStats] = useState<Stats>({
    activePlayers: 0,
    gamesAnalyzed: 0,
    aiLessons: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { count: playersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: gamesCount } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      setStats({
        activePlayers: playersCount || 0,
        gamesAnalyzed: gamesCount || 0,
        aiLessons: 0,
      });
    };

    fetchStats();

    const profilesChannel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchStats)
      .subscribe();

    const gamesChannel = supabase
      .channel('games-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(gamesChannel);
    };
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
  };

  const statsData = [
    {
      icon: Users,
      value: formatNumber(stats.activePlayers) + '+',
      label: 'Active Players',
      color: 'text-primary'
    },
    {
      icon: TrendingUp,
      value: formatNumber(stats.gamesAnalyzed) + '+',
      label: 'Games Analyzed',
      color: 'text-chart-2'
    },
    {
      icon: BookOpen,
      value: formatNumber(stats.aiLessons) + '+',
      label: 'AI Lessons',
      color: 'text-accent'
    },
    {
      icon: Clock,
      value: '24/7',
      label: 'AI Support',
      color: 'text-chart-4'
    }
  ];

  return (
    <section className="py-16 px-4 border-y border-border bg-background">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="p-6 text-center border-2 hover:border-primary/30 transition-all">
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                  <div className={`text-3xl lg:text-4xl font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
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
