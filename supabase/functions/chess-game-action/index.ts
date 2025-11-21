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

    const { gameId, action, data } = await req.json();

    console.log('Game action:', { gameId, action, userId: user.id });

    // Fetch game
    const { data: game } = await supabaseClient
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (!game) {
      throw new Error('Game not found');
    }

    const isWhitePlayer = game.white_player_id === user.id;
    const isBlackPlayer = game.black_player_id === user.id;

    if (!isWhitePlayer && !isBlackPlayer) {
      throw new Error('Not a player in this game');
    }

    switch (action) {
      case 'resign':
        const winnerId = isWhitePlayer ? game.black_player_id : game.white_player_id;
        
        await supabaseClient
          .from('games')
          .update({
            status: 'completed',
            result: 'resignation',
            winner_id: winnerId,
            completed_at: new Date().toISOString(),
          })
          .eq('id', gameId);

        const resignRatingChanges = await updateEloRatings(
          supabaseClient,
          game.white_player_id,
          game.black_player_id,
          isWhitePlayer ? 'black_win' : 'white_win'
        );
        
        // Store rating changes
        await supabaseClient
          .from('games')
          .update({
            white_rating_change: resignRatingChanges.whiteChange,
            black_rating_change: resignRatingChanges.blackChange
          })
          .eq('id', gameId);

        await supabaseClient.from('notifications').insert({
          user_id: winnerId,
          type: 'game_ended',
          title: 'Opponent Resigned',
          message: 'Your opponent has resigned. You win!',
        });

        console.log('Player resigned');
        break;

      case 'offer_draw':
        await supabaseClient
          .from('games')
          .update({
            draw_offered_by: user.id,
          })
          .eq('id', gameId);

        // Notify opponent
        await supabaseClient.from('notifications').insert({
          user_id: isWhitePlayer ? game.black_player_id : game.white_player_id,
          type: 'draw_offered',
          title: 'Draw Offered',
          message: 'Your opponent has offered a draw.',
        });

        console.log('Draw offered');
        break;

      case 'accept_draw':
        if (game.draw_offered_by === user.id) {
          throw new Error('Cannot accept your own draw offer');
        }

        if (!game.draw_offered_by) {
          throw new Error('No draw offer to accept');
        }

        await supabaseClient
          .from('games')
          .update({
            status: 'completed',
            result: 'draw',
            completed_at: new Date().toISOString(),
            draw_offered_by: null,
          })
          .eq('id', gameId);

        const drawRatingChanges = await updateEloRatings(
          supabaseClient,
          game.white_player_id,
          game.black_player_id,
          'draw'
        );
        
        // Store rating changes
        await supabaseClient
          .from('games')
          .update({
            white_rating_change: drawRatingChanges.whiteChange,
            black_rating_change: drawRatingChanges.blackChange
          })
          .eq('id', gameId);

        await supabaseClient.from('notifications').insert([
          {
            user_id: game.white_player_id,
            type: 'game_ended',
            title: 'Draw Accepted',
            message: 'The game has ended in a draw.',
          },
          {
            user_id: game.black_player_id,
            type: 'game_ended',
            title: 'Draw Accepted',
            message: 'The game has ended in a draw.',
          },
        ]);

        console.log('Draw accepted');
        break;

      case 'decline_draw':
        if (game.draw_offered_by === user.id) {
          throw new Error('Cannot decline your own draw offer');
        }

        await supabaseClient
          .from('games')
          .update({
            draw_offered_by: null,
          })
          .eq('id', gameId);

        console.log('Draw declined');
        break;

      case 'request_undo':
        await supabaseClient
          .from('games')
          .update({
            undo_requested_by: user.id,
          })
          .eq('id', gameId);

        // Notify opponent
        await supabaseClient.from('notifications').insert({
          user_id: isWhitePlayer ? game.black_player_id : game.white_player_id,
          type: 'undo_requested',
          title: 'Takeback Requested',
          message: 'Your opponent has requested to undo the last move.',
        });

        // Add chat message
        await supabaseClient.from('game_chat_messages').insert({
          game_id: gameId,
          user_id: user.id,
          message: '🔄 Requested to take back the last move',
        });

        console.log('Undo requested');
        break;

      case 'cancel_undo':
        if (game.undo_requested_by !== user.id) {
          throw new Error('Cannot cancel - no active takeback request from you');
        }

        await supabaseClient
          .from('games')
          .update({
            undo_requested_by: null,
          })
          .eq('id', gameId);

        // Add chat message
        await supabaseClient.from('game_chat_messages').insert({
          game_id: gameId,
          user_id: user.id,
          message: '❌ Cancelled takeback request',
        });

        console.log('Undo cancelled');
        break;

      case 'accept_undo':
        if (game.undo_requested_by === user.id) {
          throw new Error('Cannot accept your own undo request');
        }

        if (!game.undo_requested_by) {
          throw new Error('No undo request pending');
        }

        // Get the last two moves and delete them
        const { data: lastMoves } = await supabaseClient
          .from('game_moves')
          .select('*')
          .eq('game_id', gameId)
          .order('move_number', { ascending: false })
          .limit(2);

        if (lastMoves && lastMoves.length > 0) {
          // Delete the last moves
          await supabaseClient
            .from('game_moves')
            .delete()
            .eq('game_id', gameId)
            .gte('move_number', lastMoves[lastMoves.length - 1].move_number);

          // Get the FEN before the moves
          const fenBefore = lastMoves[lastMoves.length - 1].fen_before;
          
          // Update game state
          await supabaseClient
            .from('games')
            .update({
              current_fen: fenBefore,
              undo_requested_by: null,
              move_count: game.move_count - lastMoves.length,
              current_turn: lastMoves.length === 2 ? game.current_turn : (game.current_turn === 'w' ? 'b' : 'w'),
            })
            .eq('id', gameId);
        }

        // Notify requester
        await supabaseClient.from('notifications').insert({
          user_id: game.undo_requested_by,
          type: 'undo_accepted',
          title: 'Takeback Accepted',
          message: 'Your takeback request was accepted.',
        });

        // Add chat message
        await supabaseClient.from('game_chat_messages').insert({
          game_id: gameId,
          user_id: user.id,
          message: '✅ Accepted takeback request',
        });

        console.log('Undo accepted');
        break;

      case 'decline_undo':
        if (game.undo_requested_by === user.id) {
          throw new Error('Cannot decline your own undo request');
        }

        await supabaseClient
          .from('games')
          .update({
            undo_requested_by: null,
          })
          .eq('id', gameId);

        // Notify requester
        await supabaseClient.from('notifications').insert({
          user_id: game.undo_requested_by,
          type: 'undo_declined',
          title: 'Takeback Declined',
          message: 'Your takeback request was declined.',
        });

        // Add chat message
        await supabaseClient.from('game_chat_messages').insert({
          game_id: gameId,
          user_id: user.id,
          message: '❌ Declined takeback request',
        });

        console.log('Undo declined');
        break;

      default:
        throw new Error('Unknown action');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chess-game-action:', error);
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