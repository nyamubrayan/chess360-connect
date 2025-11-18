import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Chess } from 'https://esm.sh/chess.js@1.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { gameId, move, promotionPiece } = await req.json();

    console.log('Validating move:', { gameId, move, promotionPiece, userId: user.id });

    // Fetch game state
    const { data: game, error: gameError } = await supabaseClient
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      throw new Error('Game not found');
    }

    // Verify it's the player's turn
    const isWhitePlayer = game.white_player_id === user.id;
    const isBlackPlayer = game.black_player_id === user.id;
    
    if (!isWhitePlayer && !isBlackPlayer) {
      throw new Error('Not a player in this game');
    }

    const chess = new Chess(game.current_fen);
    const currentTurn = chess.turn();
    
    if ((currentTurn === 'w' && !isWhitePlayer) || (currentTurn === 'b' && !isBlackPlayer)) {
      throw new Error('Not your turn');
    }

    // Validate and make the move
    const moveObj = typeof move === 'string' 
      ? { from: move.slice(0, 2), to: move.slice(2, 4), promotion: promotionPiece }
      : { ...move, promotion: promotionPiece };

    const result = chess.move(moveObj);
    
    if (!result) {
      throw new Error('Invalid move');
    }

    const newFen = chess.fen();
    const newPgn = chess.pgn();
    const isCheck = chess.isCheck();
    const isCheckmate = chess.isCheckmate();
    const isStalemate = chess.isStalemate();
    const isDraw = chess.isDraw();
    const isThreefoldRepetition = chess.isThreefoldRepetition();
    const isInsufficientMaterial = chess.isInsufficientMaterial();

    // Calculate new game status
    let status = game.status;
    let result_status = game.result;
    let winner = game.winner_id;

    if (isCheckmate) {
      status = 'completed';
      result_status = currentTurn === 'w' ? 'black_won' : 'white_won';
      winner = currentTurn === 'w' ? game.black_player_id : game.white_player_id;
    } else if (isStalemate) {
      status = 'completed';
      result_status = 'stalemate';
    } else if (isDraw || isThreefoldRepetition || isInsufficientMaterial) {
      status = 'completed';
      result_status = 'draw';
    }

    // Get move history for position tracking
    const history = chess.history({ verbose: true });
    const lastMove = history[history.length - 1];

    // Update fifty-move counter
    let fiftyMoveCounter = game.fifty_move_counter + 1;
    if (result.captured || result.piece === 'p') {
      fiftyMoveCounter = 0;
    }

    // Check fifty-move rule
    if (fiftyMoveCounter >= 100) {
      status = 'completed';
      result_status = 'draw';
    }

    // Track position for threefold repetition
    const positionHistory = [...(game.position_history || []), newFen];

    const response = {
      valid: true,
      newFen,
      newPgn,
      status,
      result: result_status,
      winner,
      isCheck,
      isCheckmate,
      isStalemate,
      isDraw,
      isCapture: !!result.captured,
      isCastling: result.flags.includes('k') || result.flags.includes('q'),
      isEnPassant: result.flags.includes('e'),
      promotionPiece: result.promotion,
      moveSan: result.san,
      moveUci: `${result.from}${result.to}${result.promotion || ''}`,
      fiftyMoveCounter,
      positionHistory,
      moveNumber: Math.floor(chess.moveNumber()),
    };

    console.log('Move validated:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error validating move:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, valid: false }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});