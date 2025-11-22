import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to update tournament match
async function updateTournamentMatch(
  supabaseClient: any,
  gameId: string,
  winnerId: string | null
) {
  // Check if this game is part of a tournament
  const { data: tournamentMatch } = await supabaseClient
    .from('tournament_matches')
    .select('*, tournaments(format)')
    .eq('game_id', gameId)
    .maybeSingle();

  if (tournamentMatch) {
    console.log('Updating tournament match:', tournamentMatch.id);
    
    await supabaseClient
      .from('tournament_matches')
      .update({
        winner_id: winnerId,
        status: 'completed'
      })
      .eq('id', tournamentMatch.id);

    // For single elimination, mark loser as eliminated
    if (tournamentMatch.tournaments.format === 'single_elimination' && winnerId) {
      const loserId = winnerId === tournamentMatch.player1_id 
        ? tournamentMatch.player2_id 
        : tournamentMatch.player1_id;
      
      await supabaseClient
        .from('tournament_participants')
        .update({ status: 'eliminated' })
        .eq('tournament_id', tournamentMatch.tournament_id)
        .eq('user_id', loserId);
    }
  }
}

// Helper function to update ELO ratings
async function updateEloRatings(
  supabaseClient: any,
  whitePlayerId: string,
  blackPlayerId: string,
  result: 'white_win' | 'black_win' | 'draw'
) {
  const { data: profiles } = await supabaseClient
    .from('profiles')
    .select('id, rating')
    .in('id', [whitePlayerId, blackPlayerId]);

  if (profiles && profiles.length === 2) {
    const whiteProfile = profiles.find((p: any) => p.id === whitePlayerId);
    const blackProfile = profiles.find((p: any) => p.id === blackPlayerId);

    if (whiteProfile && blackProfile) {
      const whiteRating = whiteProfile.rating || 1200;
      const blackRating = blackProfile.rating || 1200;

      const expectedWhite = 1 / (1 + Math.pow(10, (blackRating - whiteRating) / 400));
      const expectedBlack = 1 / (1 + Math.pow(10, (whiteRating - blackRating) / 400));

      let whiteScore = 0.5;
      let blackScore = 0.5;

      if (result === 'white_win') {
        whiteScore = 1;
        blackScore = 0;
      } else if (result === 'black_win') {
        whiteScore = 0;
        blackScore = 1;
      }

      const K = 32;
      const newWhiteRating = Math.round(whiteRating + K * (whiteScore - expectedWhite));
      const newBlackRating = Math.round(blackRating + K * (blackScore - expectedBlack));

      await supabaseClient.from('profiles').update({ rating: newWhiteRating }).eq('id', whitePlayerId);
      await supabaseClient.from('profiles').update({ rating: newBlackRating }).eq('id', blackPlayerId);

      const whiteChange = newWhiteRating - whiteRating;
      const blackChange = newBlackRating - blackRating;

      console.log('Ratings updated:', {
        white: { old: whiteRating, new: newWhiteRating, change: whiteChange },
        black: { old: blackRating, new: newBlackRating, change: blackChange }
      });
      
      return { whiteChange, blackChange };
    }
  }
  
  return { whiteChange: 0, blackChange: 0 };
}

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

    const { gameId, from, to, promotionPiece, moveData } = await req.json();

    console.log('Making move:', { gameId, from, to, promotionPiece, userId: user.id });

    // Fetch current game
    const { data: game } = await supabaseClient
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (!game) {
      throw new Error('Game not found');
    }

    // If from/to provided, validate and calculate move data first
    let validatedMoveData = moveData;
    if (from && to) {
      const { Chess } = await import('https://esm.sh/chess.js@1.0.0-beta.8');
      const chess = new Chess(game.current_fen);

      // Validate it's the player's turn
      const isWhitePlayer = game.white_player_id === user.id;
      const currentTurn = chess.turn();
      
      if ((isWhitePlayer && currentTurn !== 'w') || (!isWhitePlayer && currentTurn !== 'b')) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Not your turn' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Try to make the move
      const move = chess.move({ 
        from, 
        to, 
        promotion: promotionPiece || 'q' 
      });

      if (!move) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Invalid move' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Build move data
      const newFen = chess.fen();
      const newPgn = chess.pgn();
      const isCheck = chess.isCheck();
      const isCheckmate = chess.isCheckmate();
      const isDraw = chess.isDraw();
      const isStalemate = chess.isStalemate();
      const isThreefoldRepetition = chess.isThreefoldRepetition();
      const isInsufficientMaterial = chess.isInsufficientMaterial();

      // Determine game status
      let status = 'active';
      let result = null;
      let winner = null;

      if (isCheckmate) {
        status = 'completed';
        result = 'checkmate';
        winner = isWhitePlayer ? game.white_player_id : game.black_player_id;
      } else if (isStalemate) {
        status = 'completed';
        result = 'stalemate';
      } else if (isDraw || isThreefoldRepetition || isInsufficientMaterial) {
        status = 'completed';
        result = 'draw';
      }

      validatedMoveData = {
        valid: true,
        newFen,
        newPgn,
        moveSan: move.san,
        moveUci: move.from + move.to + (move.promotion || ''),
        moveNumber: game.move_count + 1,
        isCheck,
        isCheckmate,
        isCapture: move.captured !== undefined,
        isCastling: move.flags.includes('k') || move.flags.includes('q'),
        isEnPassant: move.flags.includes('e'),
        promotionPiece: move.promotion || null,
        status,
        result,
        winner,
        fiftyMoveCounter: 0,
        positionHistory: []
      };
    }

    if (!validatedMoveData) {
      throw new Error('Invalid move data');
    }

    // Calculate time spent
    const now = new Date();
    const lastMoveTime = game.last_move_at ? new Date(game.last_move_at) : now;
    const timeSpent = Math.floor((now.getTime() - lastMoveTime.getTime()) / 1000);

    const isWhitePlayer = game.white_player_id === user.id;
    const currentTimeRemaining = isWhitePlayer 
      ? game.white_time_remaining 
      : game.black_time_remaining;

    // Update time remaining
    const newTimeRemaining = Math.max(0, currentTimeRemaining - timeSpent + game.time_increment);

    // Check for timeout
    if (newTimeRemaining === 0) {
      await supabaseClient
        .from('games')
        .update({
          status: 'completed',
          result: 'timeout',
          winner_id: isWhitePlayer ? game.black_player_id : game.white_player_id,
          completed_at: now.toISOString(),
        })
        .eq('id', gameId);

      const ratingChanges = await updateEloRatings(
        supabaseClient,
        game.white_player_id,
        game.black_player_id,
        isWhitePlayer ? 'black_win' : 'white_win'
      );
      
      // Store rating changes
      await supabaseClient
        .from('games')
        .update({
          white_rating_change: ratingChanges.whiteChange,
          black_rating_change: ratingChanges.blackChange
        })
        .eq('id', gameId);

      return new Response(
        JSON.stringify({ error: 'Time expired', timeout: true }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Update game state
    const updates: any = {
      current_fen: validatedMoveData.newFen,
      pgn: validatedMoveData.newPgn,
      current_turn: validatedMoveData.newFen.split(' ')[1],
      last_move_at: now.toISOString(),
      move_count: game.move_count + 1,
      fifty_move_counter: validatedMoveData.fiftyMoveCounter || 0,
      position_history: validatedMoveData.positionHistory || [],
      draw_offered_by: null,
      undo_requested_by: null,
    };

    if (isWhitePlayer) {
      updates.white_time_remaining = newTimeRemaining;
    } else {
      updates.black_time_remaining = newTimeRemaining;
    }

    if (validatedMoveData.status) {
      updates.status = validatedMoveData.status;
      updates.result = validatedMoveData.result;
      updates.winner_id = validatedMoveData.winner;
      if (validatedMoveData.status === 'completed') {
        updates.completed_at = now.toISOString();
      }
    }

    const { error: updateError } = await supabaseClient
      .from('games')
      .update(updates)
      .eq('id', gameId);

    if (updateError) {
      throw updateError;
    }

    // Update ELO ratings and send notifications if game ended
    if (validatedMoveData.status === 'completed') {
      let eloResult: 'white_win' | 'black_win' | 'draw' = 'draw';
      
      if (validatedMoveData.result === 'checkmate') {
        eloResult = validatedMoveData.winner === game.white_player_id ? 'white_win' : 'black_win';
      } else if (validatedMoveData.result === 'stalemate' || validatedMoveData.result === 'draw') {
        eloResult = 'draw';
      }

      const ratingChanges = await updateEloRatings(
        supabaseClient,
        game.white_player_id,
        game.black_player_id,
        eloResult
      );
      
      // Store rating changes
      await supabaseClient
        .from('games')
        .update({
          white_rating_change: ratingChanges.whiteChange,
          black_rating_change: ratingChanges.blackChange
        })
        .eq('id', gameId);

      const notifications = [];
      
      if (validatedMoveData.result === 'checkmate') {
        const winnerId = validatedMoveData.winner;
        const loserId = winnerId === game.white_player_id ? game.black_player_id : game.white_player_id;
        
        notifications.push(
          {
            user_id: winnerId,
            type: 'game_ended',
            title: 'Victory!',
            message: 'You won by checkmate! Well played.',
          },
          {
            user_id: loserId,
            type: 'game_ended',
            title: 'Checkmate',
            message: 'You have been checkmated. Game over.',
          }
        );
      } else if (validatedMoveData.result === 'stalemate' || validatedMoveData.result === 'draw') {
        notifications.push(
          {
            user_id: game.white_player_id,
            type: 'game_ended',
            title: 'Game Drawn',
            message: `The game has ended in a ${validatedMoveData.result}.`,
          },
          {
            user_id: game.black_player_id,
            type: 'game_ended',
            title: 'Game Drawn',
            message: `The game has ended in a ${validatedMoveData.result}.`,
          }
        );
      }

      if (notifications.length > 0) {
        await supabaseClient.from('notifications').insert(notifications);
        console.log('Game ended notifications sent:', validatedMoveData.result);
      }
      
      // Update tournament match if applicable
      await updateTournamentMatch(supabaseClient, gameId, validatedMoveData.winner || null);
    }

    // Insert move record
    await supabaseClient.from('game_moves').insert({
      game_id: gameId,
      move_number: validatedMoveData.moveNumber,
      player_id: user.id,
      move_san: validatedMoveData.moveSan,
      move_uci: validatedMoveData.moveUci,
      fen_before: game.current_fen,
      fen_after: validatedMoveData.newFen,
      time_spent: timeSpent * 1000,
      time_remaining: newTimeRemaining * 1000,
      is_check: validatedMoveData.isCheck,
      is_checkmate: validatedMoveData.isCheckmate,
      is_capture: validatedMoveData.isCapture,
      is_castling: validatedMoveData.isCastling,
      is_en_passant: validatedMoveData.isEnPassant,
      promotion_piece: validatedMoveData.promotionPiece,
    });

    console.log('Move completed successfully. Game status:', updates.status || 'active');

    return new Response(
      JSON.stringify({ 
        success: true, 
        valid: true,
        timeRemaining: newTimeRemaining,
        ...validatedMoveData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error making move:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});