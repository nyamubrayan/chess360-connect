import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ChessTimerProps {
  game: any;
  playerColor: 'white' | 'black' | null;
  className?: string;
}

export const ChessTimer = ({ game, playerColor, className }: ChessTimerProps) => {
  const [whiteTime, setWhiteTime] = useState(game.white_time_remaining);
  const [blackTime, setBlackTime] = useState(game.black_time_remaining);

  useEffect(() => {
    setWhiteTime(game.white_time_remaining);
    setBlackTime(game.black_time_remaining);
  }, [game.white_time_remaining, game.black_time_remaining]);

  useEffect(() => {
    // Only run timer if game is active AND first move has been made
    if (game.status !== 'active' || game.move_count === 0) return;

    const interval = setInterval(() => {
      const currentTurn = game.current_turn;
      const timeSinceLastMove = game.last_move_at 
        ? Math.floor((Date.now() - new Date(game.last_move_at).getTime()) / 1000)
        : 0;

      if (currentTurn === 'w') {
        const newTime = Math.max(0, game.white_time_remaining - timeSinceLastMove);
        setWhiteTime(newTime);
        
        // Check if time ran out for white player
        if (newTime === 0 && game.white_time_remaining > 0) {
          handleTimeout('white');
        }
      } else {
        const newTime = Math.max(0, game.black_time_remaining - timeSinceLastMove);
        setBlackTime(newTime);
        
        // Check if time ran out for black player
        if (newTime === 0 && game.black_time_remaining > 0) {
          handleTimeout('black');
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [game]);

  const handleTimeout = async (color: 'white' | 'black') => {
    // End game due to timeout
    const winnerId = color === 'white' ? game.black_player_id : game.white_player_id;
    
    await supabase
      .from('games')
      .update({
        status: 'completed',
        result: color === 'white' ? '0-1' : '1-0',
        winner_id: winnerId,
        completed_at: new Date().toISOString()
      })
      .eq('id', game.id);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isWhiteTurn = game.current_turn === 'w';
  const isBlackTurn = game.current_turn === 'b';

  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      {/* Opponent Timer */}
      <Card className={`gradient-card p-3 sm:p-4 ${
        playerColor === 'white' ? (isBlackTurn ? 'ring-2 ring-primary' : '') :
        playerColor === 'black' ? (isWhiteTurn ? 'ring-2 ring-primary' : '') : ''
      }`}>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs sm:text-sm text-muted-foreground">
            {playerColor === 'white' ? 'Black' : 'White'}
          </span>
        </div>
        <p className="text-lg sm:text-2xl font-mono font-bold mt-1">
          {formatTime(playerColor === 'white' ? blackTime : whiteTime)}
        </p>
      </Card>

      {/* Your Timer */}
      <Card className={`gradient-card p-3 sm:p-4 ${
        playerColor === 'white' ? (isWhiteTurn ? 'ring-2 ring-primary' : '') :
        playerColor === 'black' ? (isBlackTurn ? 'ring-2 ring-primary' : '') : ''
      }`}>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs sm:text-sm text-muted-foreground">
            You ({playerColor})
          </span>
        </div>
        <p className="text-lg sm:text-2xl font-mono font-bold mt-1">
          {formatTime(playerColor === 'white' ? whiteTime : blackTime)}
        </p>
      </Card>
    </div>
  );
};