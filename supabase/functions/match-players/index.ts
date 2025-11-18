import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { timeControl, userId } = await req.json();

    console.log('Attempting to match player:', userId, 'timeControl:', timeControl);

    // Get waiting players with similar time control (excluding current user)
    const { data: waitingPlayers, error: queueError } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('status', 'waiting')
      .eq('time_control', timeControl)
      .neq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (queueError) {
      console.error('Queue error:', queueError);
      throw queueError;
    }

    console.log('Found waiting players:', waitingPlayers?.length);

    if (waitingPlayers && waitingPlayers.length > 0) {
      const opponent = waitingPlayers[0];
      
      // Randomly assign colors
      const isUserWhite = Math.random() > 0.5;
      const whitePlayerId = isUserWhite ? userId : opponent.user_id;
      const blackPlayerId = isUserWhite ? opponent.user_id : userId;

      console.log('Creating game room - White:', whitePlayerId, 'Black:', blackPlayerId);

      // Create game room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          name: 'Quick Match',
          type: 'study',
          creator_id: whitePlayerId,
          time_control: timeControl,
          time_increment: 0,
          white_player_id: whitePlayerId,
          black_player_id: blackPlayerId,
          game_status: 'active',
          white_time_remaining: timeControl * 60,
          black_time_remaining: timeControl * 60,
          last_move_at: new Date().toISOString(),
          is_private: false
        })
        .select()
        .single();

      if (roomError) {
        console.error('Room creation error:', roomError);
        throw roomError;
      }

      console.log('Room created:', room.id);

      // Add both players to room_members
      await supabase.from('room_members').insert([
        { room_id: room.id, user_id: whitePlayerId },
        { room_id: room.id, user_id: blackPlayerId }
      ]);

      // Update matchmaking queue for both players
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'matched', matched_room_id: room.id })
        .in('user_id', [userId, opponent.user_id]);

      // Send notifications to both players
      await supabase.from('notifications').insert([
        {
          user_id: whitePlayerId,
          type: 'match_found',
          title: 'Match Found!',
          message: `You will play as White. Time control: ${timeControl}min`,
          room_id: room.id
        },
        {
          user_id: blackPlayerId,
          type: 'match_found',
          title: 'Match Found!',
          message: `You will play as Black. Time control: ${timeControl}min`,
          room_id: room.id
        }
      ]);

      console.log('Match completed successfully');

      return new Response(
        JSON.stringify({
          matched: true,
          roomId: room.id,
          color: isUserWhite ? 'white' : 'black'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No opponent found, add to queue
    console.log('No opponent found, adding to queue');
    
    const { error: insertError } = await supabase
      .from('matchmaking_queue')
      .insert({
        user_id: userId,
        time_control: timeControl,
        status: 'waiting'
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ matched: false, waiting: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Match error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
