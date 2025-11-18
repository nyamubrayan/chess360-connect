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

    const { timeControl, timeIncrement, action } = await req.json();

    if (action === 'join') {
      // First, clean up stale queue entries (older than 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await supabaseClient
        .from('matchmaking_queue')
        .delete()
        .lt('created_at', fiveMinutesAgo);

      // Check if already in queue, if not add them
      const { data: existingEntry, error: existingError } = await supabaseClient
        .from('matchmaking_queue')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingError) {
        console.error('Error checking existing queue entry:', existingError);
      }

      if (!existingEntry) {
        // Join matchmaking queue (ignore duplicate errors caused by race conditions)
        const { error: insertError } = await supabaseClient
          .from('matchmaking_queue')
          .insert({
            user_id: user.id,
            time_control: timeControl,
            time_increment: timeIncrement,
          });

        if (insertError && (insertError as any).code !== '23505') {
          console.error('Error joining queue:', insertError);
          throw insertError;
        }
      }

      // Look for active matches with similar time controls (only recent entries)
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      const { data: matches } = await supabaseClient
        .from('matchmaking_queue')
        .select('*')
        .eq('time_control', timeControl)
        .eq('time_increment', timeIncrement)
        .neq('user_id', user.id)
        .gte('created_at', threeMinutesAgo)
        .order('created_at', { ascending: true })
        .limit(1);

      if (matches && matches.length > 0) {
        const opponent = matches[0];

        // Remove both users from queue
        await supabaseClient
          .from('matchmaking_queue')
          .delete()
          .in('user_id', [user.id, opponent.user_id]);

        // Create game with random color assignment
        const isWhite = Math.random() < 0.5;
        const whitePlayerId = isWhite ? user.id : opponent.user_id;
        const blackPlayerId = isWhite ? opponent.user_id : user.id;
        const timeInSeconds = timeControl * 60;

        const { data: game, error: gameError } = await supabaseClient
          .from('games')
          .insert({
            white_player_id: whitePlayerId,
            black_player_id: blackPlayerId,
            time_control: timeControl,
            time_increment: timeIncrement,
            white_time_remaining: timeInSeconds,
            black_time_remaining: timeInSeconds,
            status: 'active',
            last_move_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (gameError) {
          console.error('Error creating game:', gameError);
          throw gameError;
        }

        // Send notifications to both players
        await supabaseClient.from('notifications').insert([
          {
            user_id: whitePlayerId,
            type: 'match_found',
            title: 'Match Found!',
            message: 'Your match has started. You are playing as White.',
            room_id: game.id,
          },
          {
            user_id: blackPlayerId,
            type: 'match_found',
            title: 'Match Found!',
            message: 'Your match has started. You are playing as Black.',
            room_id: game.id,
          },
        ]);

        return new Response(JSON.stringify({ matched: true, game }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // No match found yet, wait in queue
      return new Response(JSON.stringify({ matched: false, waiting: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'leave') {
      // Leave matchmaking queue
      await supabaseClient
        .from('matchmaking_queue')
        .delete()
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ left: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in find-match:', error);
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
