import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface TrainingTimerProps {
  timeControl: number;
  timeIncrement: number;
  currentTurn: 'w' | 'b';
  playerColor: 'white' | 'black';
  lastMoveAt: string | null;
  whiteTimeRemaining: number;
  blackTimeRemaining: number;
  onTimeUpdate?: (whiteTime: number, blackTime: number) => void;
}

export function TrainingTimer({
  timeControl,
  timeIncrement,
  currentTurn,
  playerColor,
  lastMoveAt,
  whiteTimeRemaining,
  blackTimeRemaining,
  onTimeUpdate,
}: TrainingTimerProps) {
  const [whiteTime, setWhiteTime] = useState(whiteTimeRemaining);
  const [blackTime, setBlackTime] = useState(blackTimeRemaining);

  useEffect(() => {
    setWhiteTime(whiteTimeRemaining);
    setBlackTime(blackTimeRemaining);
  }, [whiteTimeRemaining, blackTimeRemaining]);

  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceLastMove = lastMoveAt 
        ? Math.floor((Date.now() - new Date(lastMoveAt).getTime()) / 1000)
        : 0;

      if (currentTurn === 'w') {
        const newTime = Math.max(0, whiteTimeRemaining - timeSinceLastMove);
        setWhiteTime(newTime);
        if (onTimeUpdate) onTimeUpdate(newTime, blackTime);
      } else {
        const newTime = Math.max(0, blackTimeRemaining - timeSinceLastMove);
        setBlackTime(newTime);
        if (onTimeUpdate) onTimeUpdate(whiteTime, newTime);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentTurn, lastMoveAt, whiteTimeRemaining, blackTimeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isWhiteTurn = currentTurn === 'w';
  const isBlackTurn = currentTurn === 'b';

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Opponent Timer */}
      <Card className={`gradient-card p-3 ${
        playerColor === 'white' ? (isBlackTurn ? 'ring-2 ring-primary' : '') :
        playerColor === 'black' ? (isWhiteTurn ? 'ring-2 ring-primary' : '') : ''
      }`}>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {playerColor === 'white' ? 'Black' : 'White'}
          </span>
        </div>
        <p className="text-xl font-mono font-bold mt-1">
          {formatTime(playerColor === 'white' ? blackTime : whiteTime)}
        </p>
      </Card>

      {/* Your Timer */}
      <Card className={`gradient-card p-3 ${
        playerColor === 'white' ? (isWhiteTurn ? 'ring-2 ring-primary' : '') :
        playerColor === 'black' ? (isBlackTurn ? 'ring-2 ring-primary' : '') : ''
      }`}>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            You
          </span>
        </div>
        <p className="text-xl font-mono font-bold mt-1">
          {formatTime(playerColor === 'white' ? whiteTime : blackTime)}
        </p>
      </Card>
    </div>
  );
}
