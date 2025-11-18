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
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';

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

    return () => {
      supabase.removeChannel(gameChannel);
      supabase.removeChannel(movesChannel);
    };
  }, [gameId]);

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
    setGame(gameData);
    chess.load(gameData.current_fen);
    setPosition(gameData.current_fen);
    
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

      if (validation.isCheckmate) {
        toast.success('Checkmate!');
      } else if (validation.isCheck) {
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
        <div className="flex items-center justify-between mb-4">
          <Button variant="secondary" size="sm" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Home
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">
            Chess Game
          </h1>
          <div className="w-20" />
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Move History */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <MoveHistory moves={moves} />
          </div>

          {/* Center: Chess Board */}
          <div className="lg:col-span-1 order-1 lg:order-2 relative">
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
              <Card className="gradient-card p-3 mb-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {playerColor === 'white' ? (blackPlayer?.display_name || blackPlayer?.username || 'Opponent') : (whitePlayer?.display_name || whitePlayer?.username || 'Opponent')}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
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
            />
            
            {/* Your Name (bottom) */}
            {playerColor && (
              <Card className="gradient-card p-3 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {playerColor === 'white' ? (whitePlayer?.display_name || whitePlayer?.username || 'You') : (blackPlayer?.display_name || blackPlayer?.username || 'You')}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
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
              className="mt-4"
            />
          </div>

          {/* Right: Game Info */}
          <div className="lg:col-span-1 order-3">
            <Card className="gradient-card p-4">
              <h3 className="text-lg font-bold mb-4">Game Information</h3>
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