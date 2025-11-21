import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateSwissPairings, calculateSwissRounds } from "./swiss-pairing.ts";

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { tournamentId, action } = await req.json();

    if (action === 'start') {
      return await startTournament(supabaseClient, tournamentId, user.id);
    } else if (action === 'progress') {
      return await progressTournament(supabaseClient, tournamentId);
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function startTournament(supabase: any, tournamentId: string, userId: string) {
  // Verify creator
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (tournamentError || tournament.creator_id !== userId) {
    throw new Error('Only tournament creator can start the tournament');
  }

  if (tournament.status !== 'upcoming') {
    throw new Error('Tournament already started');
  }

  // Get participants
  const { data: participants, error: participantsError } = await supabase
    .from('tournament_participants')
    .select('user_id')
    .eq('tournament_id', tournamentId)
    .order('joined_at', { ascending: true });

  if (participantsError) throw participantsError;

  if (participants.length < 2) {
    throw new Error('Need at least 2 participants');
  }

  // Shuffle and seed participants
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < shuffled.length; i++) {
    await supabase
      .from('tournament_participants')
      .update({ seed: i + 1, status: 'active' })
      .eq('tournament_id', tournamentId)
      .eq('user_id', shuffled[i].user_id);
  }

  let matches = [];

  if (tournament.format === 'single_elimination') {
    // Single elimination: pair adjacent players
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        matches.push({
          tournament_id: tournamentId,
          round: 1,
          match_number: Math.floor(i / 2) + 1,
          player1_id: shuffled[i].user_id,
          player2_id: shuffled[i + 1].user_id,
          status: 'ready'
        });
      }
    }
  } else if (tournament.format === 'round_robin') {
    // Round robin: everyone plays everyone
    let matchNumber = 1;
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < shuffled.length; j++) {
        matches.push({
          tournament_id: tournamentId,
          round: 1,
          match_number: matchNumber++,
          player1_id: shuffled[i].user_id,
          player2_id: shuffled[j].user_id,
          status: 'ready'
        });
      }
    }
  } else if (tournament.format === 'swiss') {
    // Swiss: first round random pairings
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        matches.push({
          tournament_id: tournamentId,
          round: 1,
          match_number: Math.floor(i / 2) + 1,
          player1_id: shuffled[i].user_id,
          player2_id: shuffled[i + 1].user_id,
          status: 'ready'
        });
      }
    }
  }

  const { error: matchError } = await supabase
    .from('tournament_matches')
    .insert(matches);

  if (matchError) throw matchError;

  // Update tournament status
  const { error: updateError } = await supabase
    .from('tournaments')
    .update({ status: 'active', current_round: 1 })
    .eq('id', tournamentId);

  if (updateError) throw updateError;

  // Create games for matches
  for (const match of matches) {
    await createGameForMatch(supabase, tournamentId, match);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function createGameForMatch(supabase: any, tournamentId: string, match: any) {
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('time_control, time_increment')
    .eq('id', tournamentId)
    .single();

  const timeInSeconds = tournament.time_control;

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      white_player_id: match.player1_id,
      black_player_id: match.player2_id,
      time_control: tournament.time_control,
      time_increment: tournament.time_increment,
      white_time_remaining: timeInSeconds,
      black_time_remaining: timeInSeconds,
      status: 'active'
    })
    .select()
    .single();

  if (!gameError && game) {
    await supabase
      .from('tournament_matches')
      .update({ game_id: game.id, status: 'in_progress' })
      .eq('id', match.id);
  }
}

async function progressTournament(supabase: any, tournamentId: string) {
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('current_round, max_participants, format')
    .eq('id', tournamentId)
    .single();

  const currentRound = tournament.current_round;

  // Check if all matches in current round are completed
  const { data: currentMatches } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round', currentRound);

  const allCompleted = currentMatches.every((m: any) => m.status === 'completed');

  if (!allCompleted) {
    return new Response(JSON.stringify({ message: 'Waiting for matches to complete' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (tournament.format === 'round_robin') {
    // Round robin: all matches created at start, just mark complete
    await supabase
      .from('tournaments')
      .update({ status: 'completed' })
      .eq('id', tournamentId);

    // Update all participants to completed
    await supabase
      .from('tournament_participants')
      .update({ status: 'completed' })
      .eq('tournament_id', tournamentId);

    return new Response(JSON.stringify({ message: 'Tournament completed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (tournament.format === 'swiss') {
    const { data: participants } = await supabase
      .from('tournament_participants')
      .select('user_id')
      .eq('tournament_id', tournamentId);

    const totalRounds = calculateSwissRounds(participants.length);

    if (currentRound >= totalRounds) {
      // Tournament complete
      await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', tournamentId);

      await supabase
        .from('tournament_participants')
        .update({ status: 'completed' })
        .eq('tournament_id', tournamentId);

      return new Response(JSON.stringify({ message: 'Tournament completed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate next round pairings
    const { data: allMatches } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId);

    const pairings = generateSwissPairings(participants, allMatches);
    const nextRound = currentRound + 1;
    const nextMatches = [];

    for (let i = 0; i < pairings.length; i++) {
      nextMatches.push({
        tournament_id: tournamentId,
        round: nextRound,
        match_number: i + 1,
        player1_id: pairings[i][0],
        player2_id: pairings[i][1],
        status: 'ready'
      });
    }

    await supabase.from('tournament_matches').insert(nextMatches);
    await supabase
      .from('tournaments')
      .update({ current_round: nextRound })
      .eq('id', tournamentId);

    // Create games
    for (const match of nextMatches) {
      await createGameForMatch(supabase, tournamentId, match);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Single elimination
  const winners = currentMatches.map((m: any) => m.winner_id).filter(Boolean);

  if (winners.length === 1) {
    // Tournament complete
    await supabase
      .from('tournaments')
      .update({ status: 'completed' })
      .eq('id', tournamentId);

    await supabase
      .from('tournament_participants')
      .update({ placement: 1, status: 'completed' })
      .eq('tournament_id', tournamentId)
      .eq('user_id', winners[0]);

    return new Response(JSON.stringify({ message: 'Tournament completed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Create next round
  const nextRound = currentRound + 1;
  const nextMatches = [];

  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      nextMatches.push({
        tournament_id: tournamentId,
        round: nextRound,
        match_number: Math.floor(i / 2) + 1,
        player1_id: winners[i],
        player2_id: winners[i + 1],
        status: 'ready'
      });
    }
  }

  await supabase.from('tournament_matches').insert(nextMatches);
  await supabase
    .from('tournaments')
    .update({ current_round: nextRound })
    .eq('id', tournamentId);

  // Create games
  for (const match of nextMatches) {
    await createGameForMatch(supabase, tournamentId, match);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}