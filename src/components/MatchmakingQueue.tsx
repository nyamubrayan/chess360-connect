import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface MatchmakingQueueProps {
  timeControl: number;
  userId: string;
  onCancel: () => void;
}

export const MatchmakingQueue = ({ timeControl, userId, onCancel }: MatchmakingQueueProps) => {
  const navigate = useNavigate();
  const [searchTime, setSearchTime] = useState(0);
  const [playMatchSound] = useState(() => {
    const audio = new Audio('/sounds/match-found.mp3');
    audio.volume = 0.5;
    return audio;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setSearchTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    console.log('Setting up matchmaking subscription for user:', userId);

    const channel = supabase
      .channel(`matchmaking-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matchmaking_queue',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('Matchmaking update:', payload);
          
          if (payload.new.status === 'matched' && payload.new.matched_room_id) {
            // Play sound
            try {
              await playMatchSound.play();
            } catch (error) {
              console.error('Error playing sound:', error);
            }

            toast.success('Match found! Loading game...');
            
            // Navigate to game room
            setTimeout(() => {
              navigate(`/play/${payload.new.matched_room_id}`);
            }, 1000);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up matchmaking subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, navigate, playMatchSound]);

  const handleCancel = async () => {
    try {
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'waiting');

      toast.info('Search cancelled');
      onCancel();
    } catch (error) {
      console.error('Error cancelling search:', error);
      toast.error('Failed to cancel search');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="gradient-card p-8 text-center max-w-md mx-auto">
      <div className="space-y-6">
        <div className="flex justify-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold mb-2">Searching for Opponent</h2>
          <p className="text-muted-foreground">
            Time Control: {timeControl} minutes
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-center gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-primary animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Searching for {formatTime(searchTime)}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleCancel}
          className="w-full gap-2"
        >
          <X className="w-4 h-4" />
          Cancel Search
        </Button>
      </div>
    </Card>
  );
};
