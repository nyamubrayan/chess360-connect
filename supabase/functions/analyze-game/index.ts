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

    // Fetch game data
    const { data: game, error: gameError } = await supabase
      .from("game_history")
      .select("*, white_player:profiles!white_player_id(username), black_player:profiles!black_player_id(username)")
      .eq("id", gameId)
      .single();

    if (gameError || !game) {
      console.error("Error fetching game:", gameError);
      return new Response(
        JSON.stringify({ error: "Game not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user ID from auth
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

    const userId = user.id;
    const playerColor = game.white_player_id === userId ? "white" : "black";
    const opponentColor = playerColor === "white" ? "black" : "white";

    // Call Lovable AI for analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `You are a chess analysis expert. Analyze the game and provide structured feedback focusing on:
1. Strengths: What the player did well (3-5 points)
2. Weaknesses: Areas for improvement (3-5 points)
3. Key moments: Critical turning points in the game (2-3 moments with move numbers)
4. Overall rating: Brief assessment of play quality
5. Suggestions: Specific advice for improvement

Return your analysis using the provided tool with structured data.`;

    const userPrompt = `Analyze this chess game:
- Player color: ${playerColor}
- Result: ${game.result}
- Total moves: ${game.total_moves}
- Moves (PGN): ${game.moves_pgn}

Provide detailed analysis of the player's performance.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "provide_analysis",
            description: "Provide structured chess game analysis",
            parameters: {
              type: "object",
              properties: {
                strengths: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of 3-5 strengths shown in the game"
                },
                weaknesses: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of 3-5 weaknesses or mistakes"
                },
                key_moments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      move_number: { type: "number" },
                      description: { type: "string" }
                    }
                  },
                  description: "2-3 critical moments in the game"
                },
                overall_rating: {
                  type: "string",
                  description: "Overall assessment of play quality"
                },
                suggestions: {
                  type: "string",
                  description: "Specific advice for improvement"
                }
              },
              required: ["strengths", "weaknesses", "key_moments", "overall_rating", "suggestions"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "provide_analysis" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No analysis returned from AI");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Store analysis in database
    const { error: insertError } = await supabase
      .from("game_analysis")
      .insert({
        game_id: gameId,
        user_id: userId,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        key_moments: analysis.key_moments,
        overall_rating: analysis.overall_rating,
        suggestions: analysis.suggestions,
      });

    if (insertError) {
      console.error("Error storing analysis:", insertError);
    }

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("analyze-game error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
