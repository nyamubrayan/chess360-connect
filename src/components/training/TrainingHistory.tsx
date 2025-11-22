import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, TrendingUp, Target, Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TrainingSession {
  id: string;
  host_player_id: string;
  guest_player_id: string | null;
  status: string;
  move_count: number;
  completed_at: string | null;
  duration: number | null;
  host_move_accuracy: number | null;
  guest_move_accuracy: number | null;
  host_good_moves: number;
  host_mistakes: number;
  host_blunders: number;
  guest_good_moves: number;
  guest_mistakes: number;
  guest_blunders: number;
  created_at: string;
  host_profile?: { display_name: string; username: string };
  guest_profile?: { display_name: string; username: string };
}

export function TrainingHistory() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      const { data: sessionsData, error } = await supabase
        .from('training_sessions')
        .select('*')
        .or(`host_player_id.eq.${user.id},guest_player_id.eq.${user.id}`)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch profiles separately
      const sessionsWithProfiles = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { data: hostProfile } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('id', session.host_player_id)
            .single();

          let guestProfile = null;
          if (session.guest_player_id) {
            const { data } = await supabase
              .from('profiles')
              .select('display_name, username')
              .eq('id', session.guest_player_id)
              .single();
            guestProfile = data;
          }

          return {
            ...session,
            host_profile: hostProfile,
            guest_profile: guestProfile
          };
        })
      );

      setSessions(sessionsWithProfiles);
    } catch (error) {
      console.error('Error fetching training sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getAccuracyColor = (accuracy: number | null) => {
    if (!accuracy) return 'text-muted-foreground';
    if (accuracy >= 90) return 'text-green-500';
    if (accuracy >= 75) return 'text-blue-500';
    if (accuracy >= 60) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getMoveStats = (session: TrainingSession, isHost: boolean) => {
    if (isHost) {
      return {
        good: session.host_good_moves,
        mistakes: session.host_mistakes,
        blunders: session.host_blunders,
        accuracy: session.host_move_accuracy
      };
    }
    return {
      good: session.guest_good_moves,
      mistakes: session.guest_mistakes,
      blunders: session.guest_blunders,
      accuracy: session.guest_move_accuracy
    };
  };

  if (loading) {
    return (
      <Card className="gradient-card">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading training history...</p>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="gradient-card">
        <CardContent className="p-8 text-center">
          <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            No training sessions yet. Complete a Smart Chess Mentor Training session to see your history here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="gradient-card">
        <CardHeader>
          <CardTitle className="text-2xl">Training History</CardTitle>
          <CardDescription>
            Track your progress and improvement across training sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {sessions.map((session) => {
                const isHost = userId === session.host_player_id;
                const stats = getMoveStats(session, isHost);
                const opponentName = isHost 
                  ? session.guest_profile?.display_name || session.guest_profile?.username || 'AI'
                  : session.host_profile?.display_name || session.host_profile?.username || 'Unknown';

                return (
                  <Card key={session.id} className="bg-muted/20 border-border">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {session.guest_player_id ? `vs ${opponentName}` : 'Solo Training'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {session.completed_at && formatDistanceToNow(new Date(session.completed_at), { addSuffix: true })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="font-semibold">{formatDuration(session.duration)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Moves</p>
                            <p className="font-semibold">{session.move_count}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <TrendingUp className={`w-4 h-4 ${getAccuracyColor(stats.accuracy)}`} />
                          <div>
                            <p className="text-xs text-muted-foreground">Accuracy</p>
                            <p className={`font-semibold ${getAccuracyColor(stats.accuracy)}`}>
                              {stats.accuracy ? `${stats.accuracy.toFixed(1)}%` : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {stats.good > 0 && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                              {stats.good} Good
                            </Badge>
                          )}
                          {stats.mistakes > 0 && (
                            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-500 border-orange-500/20">
                              {stats.mistakes} Mistakes
                            </Badge>
                          )}
                          {stats.blunders > 0 && (
                            <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/20">
                              {stats.blunders} Blunders
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
