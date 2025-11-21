import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Search, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PostGameActionsProps {
  gameId: string;
  opponentId: string;
  opponentName: string;
  timeControl: number;
  timeIncrement: number;
}

export const PostGameActions = ({ 
  gameId, 
  opponentId, 
  opponentName,
  timeControl,
  timeIncrement 
}: PostGameActionsProps) => {
  const navigate = useNavigate();
  const [rematchSent, setRematchSent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRematchRequest = async () => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Send rematch notification to opponent
      const { error } = await supabase.from('notifications').insert({
        user_id: opponentId,
        sender_id: user.id,
        type: 'rematch_request',
        title: 'Rematch Request',
        message: `${opponentName} wants a rematch!`,
        room_id: gameId, // Store original game ID for reference
      });

      if (error) throw error;

      setRematchSent(true);
      toast.success('Rematch request sent!');
    } catch (error) {
      console.error('Error sending rematch request:', error);
      toast.error('Failed to send rematch request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFindNewMatch = () => {
    navigate('/lobby');
  };

  return (
    <Card className="mb-6 border-2 border-primary/20">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-center">What's next?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={handleRematchRequest}
            disabled={rematchSent || isProcessing}
            className="w-full gap-2"
            variant={rematchSent ? "outline" : "default"}
          >
            {rematchSent ? (
              <>
                <Check className="w-4 h-4" />
                Request Sent
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Request Rematch
              </>
            )}
          </Button>
          
          <Button
            onClick={handleFindNewMatch}
            variant="secondary"
            className="w-full gap-2"
          >
            <Search className="w-4 h-4" />
            Find New Match
          </Button>
        </div>
        
        {rematchSent && (
          <p className="text-sm text-muted-foreground text-center mt-3">
            Waiting for {opponentName} to accept...
          </p>
        )}
      </CardContent>
    </Card>
  );
};
