import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';

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
    if (game.status !== 'active') return;

    const interval = setInterval(() => {
      const currentTurn = game.current_turn;
      const timeSinceLastMove = game.last_move_at 
        ? Math.floor((Date.now() - new Date(game.last_move_at).getTime()) / 1000)
        : 0;

      if (currentTurn === 'w') {
        setWhiteTime(Math.max(0, game.white_time_remaining - timeSinceLastMove));
      } else {
        setBlackTime(Math.max(0, game.black_time_remaining - timeSinceLastMove));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [game]);

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