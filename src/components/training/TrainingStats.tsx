import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Trophy, Star, Target, Award } from 'lucide-react';
import { toast } from 'sonner';

interface TrainingStatsProps {
  userId: string;
}

interface UserStats {
  total_puzzles_solved: number;
  total_lessons_completed: number;
  total_perfect_scores: number;
  total_points: number;
  training_level: number;
}

interface UserStreak {
  current_streak: number;
  longest_streak: number;
  total_training_days: number;
}

export function TrainingStats({ userId }: TrainingStatsProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchStreak();
  }, [userId]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_training_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create initial stats
        const { data: newStats, error: insertError } = await supabase
          .from('user_training_stats')
          .insert({ user_id: userId })
          .select()
          .single();

        if (insertError) throw insertError;
        setStats(newStats);
      } else {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchStreak = async () => {
    try {
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create initial streak
        const { data: newStreak, error: insertError } = await supabase
          .from('user_streaks')
          .insert({ user_id: userId })
          .select()
          .single();

        if (insertError) throw insertError;
        setStreak(newStreak);
      } else {
        setStreak(data);
      }
    } catch (error) {
      console.error('Error fetching streak:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats || !streak) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-12 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      icon: Flame,
      label: 'Streak',
      value: streak.current_streak,
      suffix: 'days',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      icon: Trophy,
      label: 'Points',
      value: stats.total_points,
      suffix: 'pts',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      icon: Target,
      label: 'Puzzles',
      value: stats.total_puzzles_solved,
      suffix: '',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Star,
      label: 'Perfect',
      value: stats.total_perfect_scores,
      suffix: '',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: Award,
      label: 'Level',
      value: stats.training_level,
      suffix: '',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.label} className={`p-4 ${stat.bgColor}`}>
          <div className="flex flex-col items-center gap-2">
            <stat.icon className={`w-6 h-6 ${stat.color}`} />
            <div className="text-center">
              <div className="text-2xl font-bold">
                {stat.value}
                {stat.suffix && <span className="text-sm ml-1">{stat.suffix}</span>}
              </div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
