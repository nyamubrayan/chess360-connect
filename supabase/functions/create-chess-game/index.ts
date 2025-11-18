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

    const { opponentId, timeControl, timeIncrement } = await req.json();

    console.log('Creating game:', { whitePlayerId: user.id, blackPlayerId: opponentId, timeControl, timeIncrement });

    // Randomly assign colors
    const isWhite = Math.random() < 0.5;
    const whitePlayerId = isWhite ? user.id : opponentId;
    const blackPlayerId = isWhite ? opponentId : user.id;

    const timeInSeconds = timeControl * 60;

    const { data: game, error } = await supabaseClient
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

    if (error) {
      console.error('Error creating game:', error);
      throw error;
    }

    console.log('Game created:', game.id);

    // Get usernames for notifications
    const { data: whiteProfile } = await supabaseClient
      .from('profiles')
      .select('username, display_name')
      .eq('id', whitePlayerId)
      .single();

    const { data: blackProfile } = await supabaseClient
      .from('profiles')
      .select('username, display_name')
      .eq('id', blackPlayerId)
      .single();

    const whiteName = whiteProfile?.display_name || whiteProfile?.username || 'Opponent';
    const blackName = blackProfile?.display_name || blackProfile?.username || 'Opponent';

    // Send notifications to both players
    await supabaseClient.from('notifications').insert([
      {
        user_id: whitePlayerId,
        type: 'game_invite',
        title: 'Game Invitation',
        message: `${blackName} invited you to a game. You are playing as White.`,
        room_id: game.id,
      },
      {
        user_id: blackPlayerId,
        type: 'game_started',
        title: 'Game Started',
        message: `Your game with ${whiteName} has started. You are playing as Black.`,
        room_id: game.id,
      },
    ]);

    return new Response(JSON.stringify({ game }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-chess-game:', error);
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