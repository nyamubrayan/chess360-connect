import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
        await supabaseClient
          .from('games')
          .update({
            status: 'completed',
            result: 'resignation',
            winner_id: isWhitePlayer ? game.black_player_id : game.white_player_id,
            completed_at: new Date().toISOString(),
          })
          .eq('id', gameId);

        // Notify opponent
        await supabaseClient.from('notifications').insert({
          user_id: isWhitePlayer ? game.black_player_id : game.white_player_id,
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

        // Notify both players
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
          title: 'Undo Requested',
          message: 'Your opponent has requested to undo the last move.',
        });

        console.log('Undo requested');
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