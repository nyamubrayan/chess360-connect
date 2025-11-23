import { useEffect, useState, useCallback } from 'react';
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
import { PostGameActions } from '@/components/PostGameActions';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus, User } from 'lucide-react';
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
  const [firstMoveCountdown, setFirstMoveCountdown] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [timeoutHandled, setTimeoutHandled] = useState(false);
  
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

  // Handler for first move timeout (per color)
  const handleFirstMoveTimeout = useCallback(
    async (color: 'white' | 'black') => {
      if (!game || !user || game.status !== 'active') return;

      const timedOutProfile = color === 'white' ? whitePlayer : blackPlayer;
      const timedOutName =
        timedOutProfile?.display_name ||
        timedOutProfile?.username ||
        (color === 'white' ? 'White player' : 'Black player');

      console.log(
        'First move timeout - aborting game for',
        color,
        'no rating changes...'
      );

      try {
        // End the game as a draw (no winner, no rating changes)
        const { error } = await supabase
          .from('games')
          .update({
            status: 'completed',
            result: 'draw',
            completed_at: new Date().toISOString(),
            white_rating_change: 0,
            black_rating_change: 0,
            // No winner_id - ensures it's treated as a draw
          })
          .eq('id', game.id)
          .eq('status', 'active'); // Only update if still active

        if (error) {
          console.error('Error ending game:', error);
          throw error;
        }

        console.log(
          'Game ended successfully - marked as draw with no rating changes'
        );

        const message = `${timedOutName} did not make their first move within 30 seconds. No rating changes.`;

        // Send notifications to both players
        await supabase.from('notifications').insert([
          {
            user_id: game.white_player_id,
            type: 'game_aborted',
            title: 'Game Aborted',
            message,
          },
          {
            user_id: game.black_player_id,
            type: 'game_aborted',
            title: 'Game Aborted',
            message,
          },
        ]);

        toast.info(
          `Game ended - ${timedOutName} did not make their first move within 30 seconds. No rating changes applied.`,
          {
            duration: 6000,
          }
        );
      } catch (error) {
        console.error('Error handling first move timeout:', error);
      }
    },
    [game, user, whitePlayer, blackPlayer]
  );

  // Monitor first move timeout - 30s for White's and Black's first moves (synchronized for both players)
  useEffect(() => {
    if (!game || game.status !== 'active') {
      setFirstMoveCountdown(null);
      return;
    }

    // White's first move phase: game just started
    const isWhiteFirstMovePhase = game.current_turn === 'w' && game.move_count === 0;
    // Black's first move phase: after White's first move
    const isBlackFirstMovePhase = game.current_turn === 'b' && game.move_count === 1;

    if (!isWhiteFirstMovePhase && !isBlackFirstMovePhase) {
      setFirstMoveCountdown(null);
      return;
    }

    const phaseColor: 'white' | 'black' = isWhiteFirstMovePhase ? 'white' : 'black';

    // Update every 100ms for smooth, synchronized countdown across both players
    const interval = setInterval(() => {
      // Use server timestamp for synchronization
      const serverTimestamp = isWhiteFirstMovePhase
        ? new Date(game.created_at).getTime()
        : game.last_move_at
        ? new Date(game.last_move_at).getTime()
        : Date.now();

      const now = Date.now();
      const elapsed = now - serverTimestamp;
      const remaining = 30000 - elapsed; // 30 seconds
      const remainingSeconds = Math.ceil(remaining / 1000);

      if (remainingSeconds <= 0) {
        setFirstMoveCountdown(0);
        // Only the player whose turn it is should handle the timeout
        if ((phaseColor === 'white' && playerColor === 'white') || 
            (phaseColor === 'black' && playerColor === 'black')) {
          handleFirstMoveTimeout(phaseColor);
        }
        clearInterval(interval);
      } else {
        setFirstMoveCountdown(remainingSeconds);
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [
    game?.status,
    game?.current_turn,
    game?.move_count,
    game?.created_at,
    game?.last_move_at,
    playerColor,
    handleFirstMoveTimeout,
  ]);

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
      // Update last move highlight
      if (data.length > 0) {
        const latestMove = data[data.length - 1];
        const moveUci = latestMove.move_uci;
        if (moveUci && moveUci.length >= 4) {
          setLastMove({
            from: moveUci.substring(0, 2),
            to: moveUci.substring(2, 4),
          });
        }
      }
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
    
    // Set player color immediately when game data arrives
    if (user) {
      if (gameData.white_player_id === user.id) {
        setPlayerColor('white');
      } else if (gameData.black_player_id === user.id) {
        setPlayerColor('black');
      }
    }
    
    // Reset timeout flag when game becomes active or when a new move is made
    if (nowActive || gameData.last_move_at !== game?.last_move_at) {
      setTimeoutHandled(false);
    }
    
    // Play game start sound when game becomes active
    if (wasWaiting && nowActive && !gameStarted) {
      sounds.playGameStart();
      setGameStarted(true);
    }

    // Handle game completion
    if (wasActive && nowCompleted) {
      console.log('Game completed:', gameData.result, 'Winner:', gameData.winner_id);
      
      // Show completion message
      // Check if this was an aborted game (draw with no moves or only White's first move)
      const wasAborted = gameData.result === 'draw' && gameData.move_count <= 1;
      
      const resultMessage = gameData.result === 'checkmate' 
        ? (gameData.winner_id === user?.id ? 'You won by checkmate!' : 'Checkmate! You lost.')
        : gameData.result === 'resignation'
        ? (gameData.winner_id === user?.id ? 'Opponent resigned. You win!' : 'You resigned.')
        : gameData.result === 'timeout'
        ? (gameData.winner_id === user?.id ? 'Opponent ran out of time. You win!' : 'Time out! You lost.')
        : wasAborted
        ? 'Game aborted - no first move within 30 seconds. No rating changes.'
        : `Game drawn by ${gameData.result}`;
      
      // Only show toast if not aborted (aborted already shows its own toast)
      if (!wasAborted) {
        toast.success(resultMessage, {
          duration: 8000,
          action: {
            label: 'Back to Lobby',
            onClick: () => navigate('/lobby'),
          },
        });
      }
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
    const testMove = chess.move({ from, to, promotion: 'q' }); // Test move
    if (testMove) chess.undo(); // Undo test move
    
    const piece = chess.get(from as Square);
    const isPromotion = piece?.type === 'p' && 
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    if (isPromotion) {
      setPendingMove({ from, to });
      setShowPromotion(true);
      return;
    }

    // Optimistically update UI immediately
    const move = chess.move({ from, to });
    if (!move) {
      toast.error('Invalid move');
      return;
    }

    // Update position and last move highlight immediately for instant feedback
    setPosition(chess.fen());
    setLastMove({ from, to });
    setIsProcessing(true);

    // Play sound immediately
    if (move.captured) {
      sounds.playCapture();
    } else if (move.flags.includes('k') || move.flags.includes('q')) {
      sounds.playCastle();
    } else {
      sounds.playMove();
    }

    // Validate with backend in background
    await executeMove(from, to);
  };

  const executeMove = async (from: string, to: string, promotionPiece?: string) => {
    try {
      // Make the move with validation in a single call
      const { data: result, error } = await supabase.functions.invoke(
        'make-chess-move',
        {
          body: { 
            gameId,
            from,
            to,
            promotionPiece 
          },
        }
      );

      if (error || !result?.valid) {
        // Revert the optimistic update on error
        chess.load(game.current_fen);
        setPosition(game.current_fen);
        throw new Error(result?.error || error?.message || 'Invalid move');
      }

      const validation = result;

      // Play additional sounds based on game state
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

  const handleCancelTakeback = async () => {
    await supabase.functions.invoke('chess-game-action', {
      body: { gameId, action: 'cancel_undo' },
    });
    toast.info('Takeback request cancelled');
  };

  const handleAddChessMate = async () => {
    if (!user || !game) return;
    
    const opponentId = playerColor === 'white' ? game.black_player_id : game.white_player_id;
    
    // Check if already friends
    const { data: existingFriendship } = await supabase
      .from('friends')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${opponentId}),and(user_id.eq.${opponentId},friend_id.eq.${user.id})`)
      .maybeSingle();
    
    if (existingFriendship) {
      toast.info('Already connected with this player');
      return;
    }
    
    // Send friend request
    const { error } = await supabase
      .from('friends')
      .insert({
        user_id: user.id,
        friend_id: opponentId,
        status: 'pending',
      });
    
    if (error) {
      toast.error('Failed to send ChessMate request');
      return;
    }
    
    // Send notification
    await supabase.from('notifications').insert({
      user_id: opponentId,
      sender_id: user.id,
      type: 'friend_request',
      title: 'New ChessMate Request',
      message: `${whitePlayer?.display_name || whitePlayer?.username || 'Someone'} wants to connect with you!`,
    });
    
    toast.success('ChessMate request sent!');
  };

  const handleViewProfile = () => {
    if (!game || !playerColor) return;
    const opponentId = playerColor === 'white' ? game.black_player_id : game.white_player_id;
    navigate(`/profile/${opponentId}`);
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
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${opponentOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span className="font-semibold text-sm sm:text-base truncate">
                      {playerColor === 'white' ? (blackPlayer?.display_name || blackPlayer?.username || 'Opponent') : (whitePlayer?.display_name || whitePlayer?.username || 'Opponent')}
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                      ({playerColor === 'white' ? (blackPlayer?.rating || 1200) : (whitePlayer?.rating || 1200)})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={handleViewProfile}
                      title="View Profile"
                    >
                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={handleAddChessMate}
                      title="Add ChessMate"
                    >
                      <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground capitalize whitespace-nowrap hidden sm:inline">
                      {playerColor === 'white' ? 'Black' : 'White'}
                    </span>
                  </div>
                </div>
              </Card>
            )}
            
            <ChessTimer
              game={game}
              playerColor={playerColor}
              className="mb-4"
              timeoutHandled={timeoutHandled}
              setTimeoutHandled={setTimeoutHandled}
            />
            
            {/* First Move Countdown Warning - Visible to Both Players */}
            {firstMoveCountdown !== null && firstMoveCountdown > 0 && (
              <Card className={`mb-4 p-3 border-2 ${
                firstMoveCountdown <= 10 
                  ? 'border-destructive bg-destructive/10' 
                  : 'border-green-500 bg-green-500/10'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    firstMoveCountdown <= 10 ? 'text-destructive' : 'text-green-600'
                  }`}>
                    Waiting for {game.current_turn === 'w' ? 'White' : 'Black'}'s first move...
                  </span>
                  <span className={`text-lg font-bold ${
                    firstMoveCountdown <= 10 ? 'text-destructive' : 'text-green-600'
                  }`}>
                    {firstMoveCountdown}s
                  </span>
                </div>
              </Card>
            )}
            
            <ChessBoardComponent
              position={position}
              onMove={handleMove}
              playerColor={playerColor}
              disabled={isProcessing || game.status !== 'active'}
              chess={chess}
              lastMove={lastMove}
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

            {/* Post-Game Actions */}
            {game.status === 'completed' && playerColor && (
              <div className="mt-4">
                <PostGameActions
                  gameId={gameId!}
                  opponentId={playerColor === 'white' ? game.black_player_id : game.white_player_id}
                  opponentName={playerColor === 'white' ? (blackPlayer?.display_name || blackPlayer?.username || 'Opponent') : (whitePlayer?.display_name || whitePlayer?.username || 'Opponent')}
                  timeControl={game.time_control}
                  timeIncrement={game.time_increment}
                  gameResult={game.result}
                  moveCount={game.move_count}
                  whitePlayerName={whitePlayer?.display_name || whitePlayer?.username || 'White'}
                  blackPlayerName={blackPlayer?.display_name || blackPlayer?.username || 'Black'}
                />
              </div>
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
              onCancelTakeback={handleCancelTakeback}
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