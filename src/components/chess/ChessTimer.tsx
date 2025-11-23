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

  // Synchronize timer display with server state immediately
  useEffect(() => {
    // Always sync to server time when game state updates
    setWhiteTime(game.white_time_remaining);
    setBlackTime(game.black_time_remaining);
  }, [game.id, game.white_time_remaining, game.black_time_remaining, game.last_move_at]);

  // Synchronized clock countdown using server timestamps
  useEffect(() => {
    // White's clock starts after Black's first move (move_count >= 2)
    // Black's clock starts after White's second move (move_count >= 3)
    if (game.status !== 'active') return;

    // Update every 100ms for smooth, synchronized display
    const interval = setInterval(() => {
      const currentTurn = game.current_turn;
      const serverTime = game.last_move_at ? new Date(game.last_move_at).getTime() : Date.now();
      const timeSinceLastMove = Math.floor((Date.now() - serverTime) / 1000);

      // White's clock runs only after Black has made first move (move_count >= 2)
      if (currentTurn === 'w' && game.move_count >= 2) {
        const newTime = Math.max(0, game.white_time_remaining - timeSinceLastMove);
        setWhiteTime(newTime);
        
        // Check if time ran out for white player
        if (newTime === 0 && game.white_time_remaining > 0) {
          handleTimeout('white');
        }
      } else if (currentTurn === 'w') {
        // Clock not running yet, show server value
        setWhiteTime(game.white_time_remaining);
      }
      
      // Black's clock runs only after White has made second move (move_count >= 3)
      if (currentTurn === 'b' && game.move_count >= 3) {
        const newTime = Math.max(0, game.black_time_remaining - timeSinceLastMove);
        setBlackTime(newTime);
        
        // Check if time ran out for black player
        if (newTime === 0 && game.black_time_remaining > 0) {
          handleTimeout('black');
        }
      } else if (currentTurn === 'b') {
        // Clock not running yet, show server value
        setBlackTime(game.black_time_remaining);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [game.status, game.current_turn, game.move_count, game.white_time_remaining, game.black_time_remaining, game.last_move_at]);

  const handleTimeout = async (color: 'white' | 'black') => {
    // End game due to timeout
    const winnerId = color === 'white' ? game.black_player_id : game.white_player_id;
    const loserId = color === 'white' ? game.white_player_id : game.black_player_id;
    
    // Fetch both player profiles to calculate rating changes
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, bullet_rating, blitz_rating, rapid_rating')
      .in('id', [game.white_player_id, game.black_player_id]);
    
    if (!profiles || profiles.length !== 2) {
      console.error('Failed to fetch player profiles for rating calculation');
      return;
    }
    
    const whiteProfile = profiles.find(p => p.id === game.white_player_id);
    const blackProfile = profiles.find(p => p.id === game.black_player_id);
    
    // Determine game category and get appropriate ratings
    const getGameCategory = (timeControl: number) => {
      if (timeControl < 3) return 'bullet';
      if (timeControl < 10) return 'blitz';
      return 'rapid';
    };
    
    const category = getGameCategory(game.time_control);
    const whiteRating = whiteProfile?.[`${category}_rating` as keyof typeof whiteProfile] as number || 1200;
    const blackRating = blackProfile?.[`${category}_rating` as keyof typeof blackProfile] as number || 1200;
    
    // Calculate ELO changes (K-factor = 32)
    const K = 32;
    const winnerRating = color === 'white' ? blackRating : whiteRating;
    const loserRating = color === 'white' ? whiteRating : blackRating;
    
    const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));
    
    const winnerChange = Math.round(K * (1 - expectedWinner));
    const loserChange = Math.round(K * (0 - expectedLoser));
    
    await supabase
      .from('games')
      .update({
        status: 'completed',
        result: color === 'white' ? '0-1' : '1-0',
        winner_id: winnerId,
        white_rating_change: color === 'white' ? loserChange : winnerChange,
        black_rating_change: color === 'black' ? loserChange : winnerChange,
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