import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gameId } = await req.json();
    
    if (!gameId) {
      return new Response(
        JSON.stringify({ error: "gameId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch game data and analysis
    const { data: game, error: gameError } = await supabase
      .from("game_history")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameError || !game) {
      console.error("Error fetching game:", gameError);
      return new Response(
        JSON.stringify({ error: "Game not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch moves for the game
    const { data: moves, error: movesError } = await supabase
      .from("game_moves")
      .select("*")
      .eq("game_id", gameId)
      .order("move_number", { ascending: true });

    if (movesError) {
      console.error("Error fetching moves:", movesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch moves" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch game analysis if available
    const { data: analysis } = await supabase
      .from("game_analysis")
      .select("*")
      .eq("game_id", gameId)
      .eq("user_id", user.id)
      .single();

    // Use AI to identify best move and biggest blunder
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiInsights = null;
    
    if (LOVABLE_API_KEY && moves && moves.length > 5) {
      try {
        const moveSummary = moves.slice(0, 30).map(m => 
          `${m.move_number}. ${m.move_san}${m.is_check ? '+' : ''}${m.is_checkmate ? '#' : ''} ${m.is_capture ? '(capture)' : ''}`
        ).join(' ');

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a chess analyst identifying key moments for highlight reels. Respond with JSON only."
              },
              {
                role: "user",
                content: `Analyze this chess game and identify the best move, biggest blunder, and turning point. Game moves: ${moveSummary}. PGN: ${game.pgn || 'N/A'}. Result: ${game.result}. Respond with JSON: {"bestMove": {"moveNumber": N, "reason": "..."}, "blunder": {"moveNumber": N, "reason": "..."}, "turningPoint": {"moveNumber": N, "reason": "..."}}`
              }
            ]
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                aiInsights = JSON.parse(jsonMatch[0]);
              }
            } catch (e) {
              console.error("Failed to parse AI response:", e);
            }
          }
        }
      } catch (error) {
        console.error("AI analysis error:", error);
      }
    }

    // Identify key moments for highlight
    const keyMoments = [];
    
    // Opening (first 3-5 moves)
    if (moves && moves.length > 0) {
      keyMoments.push({
        type: "opening",
        title: "Opening",
        moveNumber: 1,
        fen: moves[Math.min(4, moves.length - 1)].fen_after,
        description: "The game begins"
      });
    }

    // Add best move from AI
    if (aiInsights?.bestMove && moves) {
      const bestMove = moves.find(m => m.move_number === aiInsights.bestMove.moveNumber);
      if (bestMove) {
        keyMoments.push({
          type: "best_move",
          title: "💎 Best Move!",
          moveNumber: bestMove.move_number,
          fen: bestMove.fen_after,
          move: bestMove.move_san,
          description: aiInsights.bestMove.reason
        });
      }
    }

    // Add biggest blunder from AI
    if (aiInsights?.blunder && moves) {
      const blunderMove = moves.find(m => m.move_number === aiInsights.blunder.moveNumber);
      if (blunderMove) {
        keyMoments.push({
          type: "blunder",
          title: "💥 Critical Blunder!",
          moveNumber: blunderMove.move_number,
          fen: blunderMove.fen_after,
          move: blunderMove.move_san,
          description: aiInsights.blunder.reason
        });
      }
    }

    // Add turning point from AI
    if (aiInsights?.turningPoint && moves) {
      const turningMove = moves.find(m => m.move_number === aiInsights.turningPoint.moveNumber);
      if (turningMove) {
        keyMoments.push({
          type: "turning_point",
          title: "⚡ Turning Point!",
          moveNumber: turningMove.move_number,
          fen: turningMove.fen_after,
          move: turningMove.move_san,
          description: aiInsights.turningPoint.reason
        });
      }
    }

    // Add checkmate with special animation
    const checkmateMove = moves?.find(m => m.is_checkmate);
    if (checkmateMove) {
      keyMoments.push({
        type: "checkmate",
        title: "🏆 CHECKMATE!",
        moveNumber: checkmateMove.move_number,
        fen: checkmateMove.fen_after,
        move: checkmateMove.move_san,
        description: `${checkmateMove.move_san}# - Checkmate!`
      });
    }

    // Add other critical moves if we don't have enough moments
    if (keyMoments.length < 4) {
      const importantMoves = moves?.filter(m => m.is_check || m.is_capture).slice(-2);
      importantMoves?.forEach(move => {
        keyMoments.push({
          type: move.is_check ? "check" : "capture",
          title: move.is_check ? "⚔️ Check!" : "💥 Capture!",
          moveNumber: move.move_number,
          fen: move.fen_after,
          move: move.move_san,
          description: `${move.move_san}${move.is_check ? '+' : ''}`
        });
      });
    }

    // Game result
    if (moves && moves.length > 0) {
      keyMoments.push({
        type: "result",
        title: game.result === "1-0" ? "White Wins!" : game.result === "0-1" ? "Black Wins!" : "Draw",
        moveNumber: moves[moves.length - 1].move_number,
        fen: moves[moves.length - 1].fen_after,
        description: `Game over: ${game.result}`
      });
    }

    // Determine player color and result
    const playerColor = game.white_player_id === user.id ? "white" : "black";
    const opponentColor = playerColor === "white" ? "black" : "white";
    const opponentUsername = playerColor === "white" ? game.black_player_username : game.white_player_username;
    const opponentRating = playerColor === "white" ? game.black_player_rating : game.white_player_rating;
    
    const playerWon = 
      (playerColor === "white" && game.result === "1-0") ||
      (playerColor === "black" && game.result === "0-1");
    
    const opponentWon = 
      (opponentColor === "white" && game.result === "1-0") ||
      (opponentColor === "black" && game.result === "0-1");
    
    const title = playerWon ? "🏆 Victory Highlight" : 
                  game.result?.includes("1/2") ? "⚔️ Epic Battle" : 
                  opponentWon ? "💪 Learning Experience" : "📚 Learning Moment";

    const opponentInfo = opponentUsername ? ` vs ${opponentUsername} (${opponentRating || "Unrated"})` : "";
    const description = playerWon 
      ? `Dominated as ${playerColor === "white" ? "White" : "Black"}${opponentInfo}!`
      : game.result?.includes("1/2")
      ? `Hard-fought draw as ${playerColor === "white" ? "White" : "Black"}${opponentInfo}`
      : `${opponentWon ? `Lost to ${opponentUsername || 'opponent'} as` : 'Played as'} ${playerColor === "white" ? "White" : "Black"}${opponentInfo}`;

    // Calculate duration based on key moments (aim for 30-45 seconds)
    const duration = Math.min(45, Math.max(20, keyMoments.length * 8));

    // Store highlight
    const { data: highlight, error: insertError } = await supabase
      .from("game_highlights")
      .upsert({
        game_id: gameId,
        user_id: user.id,
        title,
        description,
        key_moments: keyMoments,
        duration
      }, {
        onConflict: "game_id,user_id"
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error storing highlight:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create highlight" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ highlight }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-game-highlight error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
