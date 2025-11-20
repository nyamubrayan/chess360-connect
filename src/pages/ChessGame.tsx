import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Chess, Square } from 'chess.js';
import { toast } from 'sonner';
import { ChessBoardComponent } from '@/components/chess/ChessBoard';
import { GameControls } from '@/components/chess/GameControls';
import { MoveHistory } from '@/components/chess/MoveHistory';
import { ChessTimer } from '@/components/chess/ChessTimer';
import { PromotionDialog } from '@/components/chess/PromotionDialog';
import { GameChat } from '@/components/chess/GameChat';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useChessSounds } from '@/hooks/useChessSounds';

export default function ChessGame() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [game, setGame] = useState<any>(null);
  const [chess] = useState(new Chess());
  const [position, setPosition] = useState(chess.fen());
  const [moves, setMoves] = useState<any[]>([]);
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);
  const [showPromotion, setShowPromotion] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ from: string; to: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [whitePlayer, setWhitePlayer] = useState<any>(null);
  const [blackPlayer, setBlackPlayer] = useState<any>(null);
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  
  const sounds = useChessSounds();

  useEffect(() => {
    if (!gameId) {
      navigate('/');
      return;
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
    });

    fetchGame();

    // Subscribe to game updates
    const gameChannel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log('Game update:', payload);
          if (payload.new) {
            handleGameUpdate(payload.new);
          }
        }
      )
      .subscribe();

    // Subscribe to move updates
    const movesChannel = supabase
      .channel(`moves-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_moves',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log('Move update:', payload);
          fetchMoves();
        }
      )
      .subscribe();

    // Track presence - show online status
    const presenceChannel = supabase.channel(`presence-game-${gameId}`);
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        console.log('Presence sync:', state);
        
        // Check if opponent is online
        const allUsers = Object.values(state).flat();
        const hasOpponent = allUsers.some((u: any) => u.user_id !== user?.id);
        setOpponentOnline(hasOpponent);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(gameChannel);
      supabase.removeChannel(movesChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [gameId]);

  // Monitor first move timeout - cancel game if no first move within 30 seconds
  useEffect(() => {
    if (!game || !user || game.status !== 'active' || !playerColor) {
      setFirstMoveCountdown(null);
      return;
    }

    // Check if this is the first move (move_count === 0)
    const isFirstMove = game.move_count === 0;
    
    if (!isFirstMove) {
      setFirstMoveCountdown(null);
      return;
    }

    // Update countdown every 100ms
    const interval = setInterval(() => {
      const gameStartTime = new Date(game.created_at).getTime();
      const now = Date.now();
      const timeSinceStart = now - gameStartTime;
      const remainingTime = 30000 - timeSinceStart; // 30 seconds
      const remainingSeconds = Math.ceil(remainingTime / 1000);

      if (remainingSeconds <= 0) {
        setFirstMoveCountdown(0);
        handleFirstMoveTimeout();
        clearInterval(interval);
      } else {
        setFirstMoveCountdown(remainingSeconds);
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [game?.move_count, game?.status, game?.created_at, user, playerColor]);

  // Monitor inactivity - forfeit opponent after 20 seconds of no move (after first move)
  useEffect(() => {
    // Clear existing timer
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      setInactivityTimer(null);
    }

    // Only monitor if game is active and it's opponent's turn and game has started (move_count > 0)
    if (!game || !user || game.status !== 'active' || !playerColor || game.move_count === 0) {
      return;
    }

    const isMyTurn = (playerColor === 'white' && game.current_turn === 'w') ||
                     (playerColor === 'black' && game.current_turn === 'b');

    // Don't set timer if it's my turn
    if (isMyTurn) {
      return;
    }

    // Calculate time since last move
    const lastMoveTime = game.last_move_at ? new Date(game.last_move_at).getTime() : Date.now();
    const now = Date.now();
    const timeSinceLastMove = now - lastMoveTime;
    const remainingTime = 20000 - timeSinceLastMove; // 20 seconds

    console.log('Inactivity check:', {
      timeSinceLastMove: Math.floor(timeSinceLastMove / 1000),
      remainingTime: Math.floor(remainingTime / 1000),
      isMyTurn,
    });

    // If already past 20 seconds, forfeit immediately
    if (remainingTime <= 0) {
      handleInactivityForfeit();
      return;
    }

    // Set timer for remaining time
    const timer = setTimeout(() => {
      handleInactivityForfeit();
    }, remainingTime);

    setInactivityTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [game?.last_move_at, game?.current_turn, game?.status, game?.move_count, playerColor, user]);

  const handleFirstMoveTimeout = async () => {
    if (!game || !user || game.status !== 'active') return;

    console.log('First move timeout - canceling game after 30 seconds...');

    try {
      // Determine which player should have moved first (white always starts)
      const inactivePlayerId = game.white_player_id;

      // Cancel the game
      const { error } = await supabase
        .from('games')
        .update({
          status: 'completed',
          result: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', game.id);

      if (error) throw error;

      // Send warning notification to inactive player and info to active player
      await supabase.from('notifications').insert([
        {
          user_id: inactivePlayerId,
          type: 'game_warning',
          title: 'Game Cancelled - Warning',
          message: 'Your game was cancelled because you did not make the first move within 30 seconds. Please make your first move promptly in future games.',
        },
        {
          user_id: game.black_player_id,
          type: 'game_cancelled',
          title: 'Game Cancelled',
          message: 'The game was cancelled because your opponent did not make the first move within 30 seconds.',
        },
      ]);

      toast.warning(
        inactivePlayerId === user.id 
          ? 'Game cancelled. You must make your first move within 30 seconds.' 
          : 'Game cancelled. Opponent did not make the first move.',
        {
          duration: 5000,
          action: {
            label: 'Back to Lobby',
            onClick: () => navigate('/lobby'),
          },
        }
      );
    } catch (error) {
      console.error('Error handling first move timeout:', error);
    }
  };

  const handleInactivityForfeit = async () => {
    if (!game || !user || game.status !== 'active') return;

    console.log('Opponent inactive for 20 seconds, forfeiting...');

    try {
      // Determine which player is inactive (the one whose turn it is)
      const inactivePlayerId = game.current_turn === 'w' 
        ? game.white_player_id 
        : game.black_player_id;

      // End game due to inactivity
      const { error } = await supabase
        .from('games')
        .update({
          status: 'completed',
          result: 'inactivity',
          winner_id: inactivePlayerId === user.id ? (playerColor === 'white' ? game.black_player_id : game.white_player_id) : user.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', game.id);

      if (error) throw error;

      // Send notifications
      await supabase.from('notifications').insert([
        {
          user_id: game.white_player_id,
          type: 'game_ended',
          title: 'Game Ended',
          message: inactivePlayerId === game.white_player_id 
            ? 'You lost due to inactivity (20 seconds without a move).' 
            : 'Opponent forfeited due to inactivity. You win!',
        },
        {
          user_id: game.black_player_id,
          type: 'game_ended',
          title: 'Game Ended',
          message: inactivePlayerId === game.black_player_id 
            ? 'You lost due to inactivity (20 seconds without a move).' 
            : 'Opponent forfeited due to inactivity. You win!',
        },
      ]);

      toast.success(
        inactivePlayerId === user.id 
          ? 'You lost due to inactivity.' 
          : 'Opponent forfeited due to inactivity. You win!',
        {
          duration: 5000,
          action: {
            label: 'Back to Lobby',
            onClick: () => navigate('/lobby'),
          },
        }
      );
    } catch (error) {
      console.error('Error handling inactivity forfeit:', error);
    }
  };

  const fetchGame = async () => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .maybeSingle();

    if (error || !data) {
      console.error('Error fetching game:', error);
      toast.error('Failed to load game');
      navigate('/');
      return;
    }

    handleGameUpdate(data);
    fetchMoves();
  };

  const fetchMoves = async () => {
    const { data } = await supabase
      .from('game_moves')
      .select('*')
      .eq('game_id', gameId)
      .order('move_number', { ascending: true });

    if (data) {
      setMoves(data);
    }
  };

  const handleGameUpdate = async (gameData: any) => {
    const wasWaiting = game?.status === 'waiting';
    const nowActive = gameData.status === 'active';
    const wasActive = game?.status === 'active';
    const nowCompleted = gameData.status === 'completed';
    
    setGame(gameData);
    chess.load(gameData.current_fen);
    setPosition(gameData.current_fen);
    
    // Play game start sound when game becomes active
    if (wasWaiting && nowActive && !gameStarted) {
      sounds.playGameStart();
      setGameStarted(true);
    }

    // Handle game completion
    if (wasActive && nowCompleted) {
      console.log('Game completed:', gameData.result, 'Winner:', gameData.winner_id);
      
      // Show completion message
      const resultMessage = gameData.result === 'checkmate' 
        ? (gameData.winner_id === user?.id ? 'You won by checkmate!' : 'Checkmate! You lost.')
        : gameData.result === 'resignation'
        ? (gameData.winner_id === user?.id ? 'Opponent resigned. You win!' : 'You resigned.')
        : gameData.result === 'timeout'
        ? (gameData.winner_id === user?.id ? 'Opponent ran out of time. You win!' : 'Time out! You lost.')
        : `Game drawn by ${gameData.result}`;
      
      toast.success(resultMessage, {
        duration: 8000,
        action: {
          label: 'Back to Lobby',
          onClick: () => navigate('/lobby'),
        },
      });
    }
    
    // Fetch player profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', [gameData.white_player_id, gameData.black_player_id]);
    
    if (profiles) {
      const white = profiles.find(p => p.id === gameData.white_player_id);
      const black = profiles.find(p => p.id === gameData.black_player_id);
      setWhitePlayer(white);
      setBlackPlayer(black);
    }
  };

  // Set player color when both user and game are available
  useEffect(() => {
    if (user && game) {
      if (game.white_player_id === user.id) {
        setPlayerColor('white');
      } else if (game.black_player_id === user.id) {
        setPlayerColor('black');
      }
    }
  }, [user, game]);

  const handleMove = async (from: string, to: string) => {
    if (isProcessing || !user || game.status !== 'active') return;

    const currentTurn = chess.turn();
    const myTurn = (currentTurn === 'w' && playerColor === 'white') || 
                   (currentTurn === 'b' && playerColor === 'black');

    if (!myTurn) {
      toast.error('Not your turn');
      return;
    }

    // Check if this is a pawn promotion
    const move = chess.move({ from, to, promotion: 'q' }); // Test move
    if (move) chess.undo(); // Undo test move
    
    const piece = chess.get(from as Square);
    const isPromotion = piece?.type === 'p' && 
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    if (isPromotion) {
      setPendingMove({ from, to });
      setShowPromotion(true);
      return;
    }

    await executeMove(from, to);
  };

  const executeMove = async (from: string, to: string, promotionPiece?: string) => {
    setIsProcessing(true);

    try {
      // First validate the move server-side
      const { data: validation, error: validationError } = await supabase.functions.invoke(
        'validate-chess-move',
        {
          body: { 
            gameId, 
            move: `${from}${to}`,
            promotionPiece 
          },
        }
      );

      if (validationError || !validation.valid) {
        throw new Error(validation?.error || 'Invalid move');
      }

      // Then apply the move
      const { error: moveError } = await supabase.functions.invoke(
        'make-chess-move',
        {
          body: { 
            gameId,
            moveData: validation 
          },
        }
      );

      if (moveError) {
        throw moveError;
      }

      fetchMoves();

      // Play appropriate sound based on move result
      if (validation.isCheckmate) {
        sounds.playCheckmate();
        toast.success('Checkmate!');
      } else if (validation.isCheck) {
        sounds.playCheck();
        toast.info('Check!');
      } else if (validation.isStalemate) {
        toast.info('Stalemate');
      } else if (validation.isDraw) {
        toast.info('Draw');
      } else if (validation.isCastling) {
        sounds.playCastle();
      } else if (validation.isCapture) {
        sounds.playCapture();
      } else {
        sounds.playMove();
      }

    } catch (error: any) {
      console.error('Move error:', error);
      toast.error(error.message || 'Failed to make move');
    } finally {
      setIsProcessing(false);
      setPendingMove(null);
    }
  };

  const handlePromotion = async (piece: string) => {
    setShowPromotion(false);
    if (pendingMove) {
      await executeMove(pendingMove.from, pendingMove.to, piece);
    }
  };

  const handleResign = async () => {
    await supabase.functions.invoke('chess-game-action', {
      body: { gameId, action: 'resign' },
    });
    toast.info('You resigned');
  };

  const handleOfferDraw = async () => {
    await supabase.functions.invoke('chess-game-action', {
      body: { gameId, action: 'offer_draw' },
    });
    toast.info('Draw offer sent');
  };

  const handleAcceptDraw = async () => {
    await supabase.functions.invoke('chess-game-action', {
      body: { gameId, action: 'accept_draw' },
    });
    toast.info('Draw accepted');
  };

  const handleDeclineDraw = async () => {
    await supabase.functions.invoke('chess-game-action', {
      body: { gameId, action: 'decline_draw' },
    });
    toast.info('Draw declined');
  };

  const handleRequestTakeback = async () => {
    await supabase.functions.invoke('chess-game-action', {
      body: { gameId, action: 'request_undo' },
    });
    toast.info('Takeback requested');
  };

  const handleAcceptTakeback = async () => {
    await supabase.functions.invoke('chess-game-action', {
      body: { gameId, action: 'accept_undo' },
    });
    toast.info('Takeback accepted');
  };

  const handleDeclineTakeback = async () => {
    await supabase.functions.invoke('chess-game-action', {
      body: { gameId, action: 'decline_undo' },
    });
    toast.info('Takeback declined');
  };

  if (!game || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="gradient-card p-6">
          <p className="text-muted-foreground">Loading game...</p>
        </Card>
      </div>
    );
  }

  const isWaitingForOpponent = game.status === 'waiting';

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Button variant="secondary" size="sm" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Button>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Chess Game</h1>
          <div className="w-12 sm:w-20" />
        </div>

        {isWaitingForOpponent && (
          <Card className="gradient-card glow-primary p-6 mb-4 animate-fade-in">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-primary rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">Waiting for Opponent</h3>
                <p className="text-muted-foreground">
                  Your opponent will join shortly...
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4">
          {/* Left: Move History - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <MoveHistory moves={moves} />
          </div>

          {/* Center: Chess Board */}
          <div className="lg:col-span-1 relative">
            {isWaitingForOpponent && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2 p-6">
                  <div className="w-12 h-12 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm font-medium text-muted-foreground">Waiting...</p>
                </div>
              </div>
            )}
            
            {/* Opponent Name (top) */}
            {playerColor && (
              <Card className="gradient-card p-2 sm:p-3 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <div className={`w-2 h-2 rounded-full ${opponentOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span className="font-semibold text-sm sm:text-base">
                      {playerColor === 'white' ? (blackPlayer?.display_name || blackPlayer?.username || 'Opponent') : (whitePlayer?.display_name || whitePlayer?.username || 'Opponent')}
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      ({playerColor === 'white' ? (blackPlayer?.rating || 1200) : (whitePlayer?.rating || 1200)})
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize whitespace-nowrap">
                    {playerColor === 'white' ? 'Black' : 'White'}
                  </span>
                </div>
              </Card>
            )}
            
            <ChessTimer
              game={game}
              playerColor={playerColor}
              className="mb-4"
            />
            <ChessBoardComponent
              position={position}
              onMove={handleMove}
              playerColor={playerColor}
              disabled={isProcessing || game.status !== 'active'}
              chess={chess}
            />
            
            {/* Your Name (bottom) */}
            {playerColor && (
              <Card className="gradient-card p-2 sm:p-3 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <span className="font-semibold text-sm sm:text-base">
                      {playerColor === 'white' ? (whitePlayer?.display_name || whitePlayer?.username || 'You') : (blackPlayer?.display_name || blackPlayer?.username || 'You')}
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      ({playerColor === 'white' ? (whitePlayer?.rating || 1200) : (blackPlayer?.rating || 1200)})
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize whitespace-nowrap">
                    {playerColor} (You)
                  </span>
                </div>
              </Card>
            )}
            
            <GameControls
              game={game}
              playerColor={playerColor}
              onResign={handleResign}
              onOfferDraw={handleOfferDraw}
              onAcceptDraw={handleAcceptDraw}
              onDeclineDraw={handleDeclineDraw}
              onRequestTakeback={handleRequestTakeback}
              onAcceptTakeback={handleAcceptTakeback}
              onDeclineTakeback={handleDeclineTakeback}
              className="mt-4"
            />
          </div>

          {/* Right: Game Info - Compact on mobile */}
          <div className="lg:col-span-1 space-y-2 sm:space-y-4">
            <Card className="gradient-card p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Game Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Color:</span>
                  <span className="font-medium capitalize">{playerColor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time Control:</span>
                  <span className="font-medium">{game.time_control}+{game.time_increment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium capitalize">{game.status}</span>
                </div>
                {game.result && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Result:</span>
                    <span className="font-medium capitalize">{game.result.replace('_', ' ')}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Game Chat */}
            {!isWaitingForOpponent && whitePlayer && blackPlayer && (
              <GameChat
                gameId={gameId!}
                currentUserId={user.id}
                whitePlayer={whitePlayer}
                blackPlayer={blackPlayer}
              />
            )}
          </div>
        </div>

        <PromotionDialog
          open={showPromotion}
          onSelect={handlePromotion}
          onCancel={() => {
            setShowPromotion(false);
            setPendingMove(null);
          }}
        />
      </div>
    </div>
  );
}