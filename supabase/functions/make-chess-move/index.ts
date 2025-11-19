import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

      console.log('Ratings updated:', {
        white: { old: whiteRating, new: newWhiteRating, change: newWhiteRating - whiteRating },
        black: { old: blackRating, new: newBlackRating, change: newBlackRating - blackRating }
      });
    }
  }
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

    const { gameId, moveData } = await req.json();

    console.log('Making move:', { gameId, moveData, userId: user.id });

    // Fetch current game
    const { data: game } = await supabaseClient
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (!game) {
      throw new Error('Game not found');
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

      await updateEloRatings(
        supabaseClient,
        game.white_player_id,
        game.black_player_id,
        isWhitePlayer ? 'black_win' : 'white_win'
      );

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
      current_fen: moveData.newFen,
      pgn: moveData.newPgn,
      current_turn: moveData.newFen.split(' ')[1],
      last_move_at: now.toISOString(),
      move_count: game.move_count + 1,
      fifty_move_counter: moveData.fiftyMoveCounter,
      position_history: moveData.positionHistory,
      draw_offered_by: null, // Clear any draw offers
      undo_requested_by: null, // Clear any undo requests
    };

    if (isWhitePlayer) {
      updates.white_time_remaining = newTimeRemaining;
    } else {
      updates.black_time_remaining = newTimeRemaining;
    }

    if (moveData.status) {
      updates.status = moveData.status;
      updates.result = moveData.result;
      updates.winner_id = moveData.winner;
      if (moveData.status === 'completed') {
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
    if (moveData.status === 'completed') {
      let eloResult: 'white_win' | 'black_win' | 'draw' = 'draw';
      
      if (moveData.result === 'checkmate') {
        eloResult = moveData.winner === game.white_player_id ? 'white_win' : 'black_win';
      } else if (moveData.result === 'stalemate' || moveData.result === 'draw') {
        eloResult = 'draw';
      }

      await updateEloRatings(
        supabaseClient,
        game.white_player_id,
        game.black_player_id,
        eloResult
      );

      const notifications = [];
      
      if (moveData.result === 'checkmate') {
        const winnerId = moveData.winner;
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
      } else if (moveData.result === 'stalemate' || moveData.result === 'draw') {
        notifications.push(
          {
            user_id: game.white_player_id,
            type: 'game_ended',
            title: 'Game Drawn',
            message: `The game has ended in a ${moveData.result}.`,
          },
          {
            user_id: game.black_player_id,
            type: 'game_ended',
            title: 'Game Drawn',
            message: `The game has ended in a ${moveData.result}.`,
          }
        );
      }

      if (notifications.length > 0) {
        await supabaseClient.from('notifications').insert(notifications);
        console.log('Game ended notifications sent:', moveData.result);
      }
    }

    // Insert move record
    await supabaseClient.from('game_moves').insert({
      game_id: gameId,
      move_number: moveData.moveNumber,
      player_id: user.id,
      move_san: moveData.moveSan,
      move_uci: moveData.moveUci,
      fen_before: game.current_fen,
      fen_after: moveData.newFen,
      time_spent: timeSpent * 1000,
      time_remaining: newTimeRemaining * 1000,
      is_check: moveData.isCheck,
      is_checkmate: moveData.isCheckmate,
      is_capture: moveData.isCapture,
      is_castling: moveData.isCastling,
      is_en_passant: moveData.isEnPassant,
      promotion_piece: moveData.promotionPiece,
    });

    console.log('Move completed successfully. Game status:', updates.status || 'active');

    return new Response(
      JSON.stringify({ success: true, timeRemaining: newTimeRemaining }),
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