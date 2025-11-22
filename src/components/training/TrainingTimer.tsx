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
      <Card className={`gradient-card p-4 border transition-all ${
        playerColor === 'white' ? (isBlackTurn ? 'ring-2 ring-primary border-primary/30 glow-primary' : 'border-border/50') :
        playerColor === 'black' ? (isWhiteTurn ? 'ring-2 ring-primary border-primary/30 glow-primary' : 'border-border/50') : 'border-border/50'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">
            {playerColor === 'white' ? 'Black' : 'White'}
          </span>
        </div>
        <p className="text-2xl font-mono font-bold text-foreground">
          {formatTime(playerColor === 'white' ? blackTime : whiteTime)}
        </p>
      </Card>

      {/* Your Timer */}
      <Card className={`gradient-card p-4 border transition-all ${
        playerColor === 'white' ? (isWhiteTurn ? 'ring-2 ring-primary border-primary/30 glow-primary' : 'border-border/50') :
        playerColor === 'black' ? (isBlackTurn ? 'ring-2 ring-primary border-primary/30 glow-primary' : 'border-border/50') : 'border-border/50'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">
            You ({playerColor === 'white' ? 'White' : 'Black'})
          </span>
        </div>
        <p className="text-2xl font-mono font-bold text-foreground">
          {formatTime(playerColor === 'white' ? whiteTime : blackTime)}
        </p>
      </Card>
    </div>
  );
}
