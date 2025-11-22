import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Achievement {
  id: string;
  name: string;
  description: string;
  badge_icon: string;
  requirement_type: string;
  requirement_value: number;
  points: number;
}

interface UserAchievement {
  achievement_id: string;
  earned_at: string;
}

interface AchievementsPanelProps {
  userId: string;
}

export function AchievementsPanel({ userId }: AchievementsPanelProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
    fetchUserAchievements();

    // Subscribe to new achievements
    const channel = supabase
      .channel('user_achievements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_training_achievements',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newAchievement = achievements.find(
            (a) => a.id === payload.new.achievement_id
          );
          if (newAchievement) {
            toast.success(`🎉 Achievement Unlocked: ${newAchievement.name}!`, {
              description: newAchievement.description,
              duration: 5000,
            });
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
            fetchUserAchievements();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, achievements]);

  const fetchAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('training_achievements')
        .select('*')
        .order('requirement_value', { ascending: true });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const fetchUserAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('user_training_achievements')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setUserAchievements(data || []);
    } catch (error) {
      console.error('Error fetching user achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = (achievementId: string) => {
    return userAchievements.some((ua) => ua.achievement_id === achievementId);
  };

  const totalPoints = userAchievements.reduce((sum, ua) => {
    const achievement = achievements.find((a) => a.id === ua.achievement_id);
    return sum + (achievement?.points || 0);
  }, 0);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Achievements</h2>
          <Badge variant="secondary" className="text-lg">
            {userAchievements.length}/{achievements.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Total Points: {totalPoints}</span>
          <Progress
            value={(userAchievements.length / achievements.length) * 100}
            className="flex-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => {
          const unlocked = isUnlocked(achievement.id);
          return (
            <Card
              key={achievement.id}
              className={`p-4 transition-all ${
                unlocked
                  ? 'bg-primary/5 border-primary/20'
                  : 'opacity-50 grayscale'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-4xl">{achievement.badge_icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{achievement.name}</h3>
                    {unlocked ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {achievement.description}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    +{achievement.points} points
                  </Badge>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
