import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecordProgressParams {
  trainingType: 'puzzle' | 'opening' | 'endgame' | 'basic';
  trainingId: string;
  completed: boolean;
  score?: number;
  timeSpent?: number;
}

export function useTrainingProgress() {
  const [recording, setRecording] = useState(false);

  const recordProgress = useCallback(async (params: RecordProgressParams) => {
    try {
      setRecording(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Record training progress
      const { error: progressError } = await supabase
        .from('user_training_progress')
        .upsert({
          user_id: user.id,
          training_type: params.trainingType,
          training_id: params.trainingId,
          completed: params.completed,
          score: params.score,
          time_spent: params.timeSpent,
          completed_at: params.completed ? new Date().toISOString() : null,
        });

      if (progressError) throw progressError;

      // Update user stats
      if (params.completed) {
        const { data: stats } = await supabase
          .from('user_training_stats')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        const updates: any = {};

        if (params.trainingType === 'puzzle') {
          updates.total_puzzles_solved = (stats?.total_puzzles_solved || 0) + 1;
        } else {
          updates.total_lessons_completed = (stats?.total_lessons_completed || 0) + 1;
        }

        if (params.score === 100) {
          updates.total_perfect_scores = (stats?.total_perfect_scores || 0) + 1;
        }

        // Calculate level based on total points
        const totalActivities = (updates.total_puzzles_solved || stats?.total_puzzles_solved || 0) +
                               (updates.total_lessons_completed || stats?.total_lessons_completed || 0);
        updates.training_level = Math.floor(totalActivities / 10) + 1;

        await supabase
          .from('user_training_stats')
          .upsert({
            user_id: user.id,
            ...updates,
          });

        // Update streak
        await supabase.rpc('update_user_streak', { p_user_id: user.id });

        // Check and award achievements
        await supabase.rpc('check_and_award_achievements', { p_user_id: user.id });
      }
    } catch (error) {
      console.error('Error recording progress:', error);
      toast.error('Failed to record progress');
    } finally {
      setRecording(false);
    }
  }, []);

  return { recordProgress, recording };
}
