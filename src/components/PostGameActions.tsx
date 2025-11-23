import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Search, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PostGameActionsProps {
  gameId: string;
  opponentId: string;
  opponentName: string;
  timeControl: number;
  timeIncrement: number;
  gameResult?: string;
  moveCount?: number;
}

export const PostGameActions = ({ 
  gameId, 
  opponentId, 
  opponentName,
  timeControl,
  timeIncrement,
  gameResult,
  moveCount = 0
}: PostGameActionsProps) => {
  const navigate = useNavigate();
  const [rematchSent, setRematchSent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Game is aborted if it's a draw with 0 moves
  const isAborted = gameResult === 'draw' && moveCount === 0;

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
        {isAborted ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-center">Game Aborted</h3>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-center text-muted-foreground">
                Game ended - no first move was made within 30 seconds.
              </p>
              <p className="text-sm text-center text-muted-foreground font-medium mt-1">
                No rating changes applied.
              </p>
            </div>
          </>
        ) : (
          <h3 className="text-lg font-semibold mb-4 text-center">What's next?</h3>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!isAborted && (
            <Button
              onClick={handleRematchRequest}
              disabled={rematchSent || isProcessing}
              className="w-full gap-2"
              variant={rematchSent ? "outline" : "default"}
            >
              {rematchSent ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Request Sent
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Request Rematch
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={handleFindNewMatch}
            variant="secondary"
            className={`w-full gap-2 ${isAborted ? 'sm:col-span-2' : ''}`}
          >
            <Search className="w-4 h-4" />
            Find New Match
          </Button>
        </div>
        
        {rematchSent && !isAborted && (
          <p className="text-sm text-muted-foreground text-center mt-3">
            Waiting for {opponentName} to accept...
          </p>
        )}
      </CardContent>
    </Card>
  );
};
