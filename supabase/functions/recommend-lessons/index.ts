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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log("Fetching game history for user:", user.id);

    // Fetch user's recent games
    const { data: games, error: gamesError } = await supabase
      .from("game_history")
      .select("*")
      .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
      .order("completed_at", { ascending: false })
      .limit(20);

    if (gamesError) {
      console.error("Error fetching games:", gamesError);
      throw gamesError;
    }

    console.log(`Found ${games?.length || 0} games`);

    // Fetch user stats
    const { data: stats, error: statsError } = await supabase
      .from("player_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (statsError) {
      console.error("Error fetching stats:", statsError);
    }

    // Fetch user profile for rating
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("rating")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    // Fetch recent game analyses if available
    const { data: analyses } = await supabase
      .from("game_analysis")
      .select("strengths, weaknesses, suggestions")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Aggregate weaknesses from analyses
    const weaknessesMap = new Map<string, number>();
    analyses?.forEach((analysis: any) => {
      const weaknesses = Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [];
      weaknesses.forEach((weakness: string) => {
        weaknessesMap.set(weakness, (weaknessesMap.get(weakness) || 0) + 1);
      });
    });

    const topWeaknesses = Array.from(weaknessesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([weakness]) => weakness);

    // Analyze games to extract patterns
    const analysis = {
      totalGames: games?.length || 0,
      wins: games?.filter(g => g.winner_id === user.id).length || 0,
      losses: games?.filter(g => g.winner_id && g.winner_id !== user.id).length || 0,
      draws: games?.filter(g => !g.winner_id && g.result === 'draw').length || 0,
      rating: profile?.rating || 1200,
      winRate: stats?.win_rate || 0,
      avgGameLength: games?.reduce((sum, g) => sum + (g.move_count || 0), 0) / (games?.length || 1) || 0,
      recentResults: games?.slice(0, 5).map(g => ({
        result: g.winner_id === user.id ? 'win' : (g.winner_id ? 'loss' : 'draw'),
        moveCount: g.move_count,
        opponent: g.white_player_id === user.id ? g.black_player_username : g.white_player_username
      })) || []
    };

    console.log("Game analysis:", analysis);
    console.log("Top weaknesses from AI analysis:", topWeaknesses);

    const systemPrompt = `You are an expert chess coach analyzing a player's game history to provide personalized learning recommendations. Based on the player's statistics, recent performance, and identified weaknesses, suggest 4-5 specific, actionable lessons that will help them improve.

Each recommendation should include:
- A clear title (max 8 words)
- A priority level (high/medium/low) based on impact
- A category (opening/middlegame/endgame/tactics/strategy)
- A detailed reason explaining why this lesson is recommended for THIS specific player
- Specific areas this lesson addresses from their game history

Be specific and personalized. Reference their actual statistics and patterns in the reasoning.`;

    const userPrompt = `Player Statistics:
- Rating: ${analysis.rating}
- Total Games Played: ${analysis.totalGames}
- Win Rate: ${analysis.winRate.toFixed(1)}%
- Wins: ${analysis.wins}, Losses: ${analysis.losses}, Draws: ${analysis.draws}
- Average Game Length: ${analysis.avgGameLength.toFixed(0)} moves

Recent Performance (last 5 games):
${analysis.recentResults.map((r, i) => `${i + 1}. ${r.result} vs ${r.opponent} (${r.moveCount} moves)`).join('\n')}

${topWeaknesses.length > 0 ? `Identified Weaknesses from AI Analysis:\n${topWeaknesses.join('\n')}` : ''}

${analyses && analyses.length > 0 ? `Recent AI Suggestions:\n${analyses.map((a: any) => a.suggestions).filter(Boolean).slice(0, 2).join('\n')}` : ''}

Based on this data, recommend 4-5 personalized chess lessons that will help this player improve. Focus on their specific weaknesses and playing patterns.`;

    console.log("Calling Lovable AI for recommendations...");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
          name: "suggest_lessons",
          description: "Return 4-5 personalized chess lesson recommendations",
          parameters: {
            type: "object",
            properties: {
              lessons: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Lesson title (max 8 words)" },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                    category: { type: "string", enum: ["opening", "middlegame", "endgame", "tactics", "strategy"] },
                    reason: { type: "string", description: "Detailed explanation of why this lesson is recommended" },
                    targetAreas: { 
                      type: "array", 
                      items: { type: "string" },
                      description: "Specific areas this addresses"
                    }
                  },
                  required: ["title", "priority", "category", "reason", "targetAreas"],
                  additionalProperties: false
                }
              }
            },
            required: ["lessons"],
            additionalProperties: false
          }
        }],
        tool_choice: { type: "function", function: { name: "suggest_lessons" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate recommendations" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData));
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response");
      throw new Error("Failed to generate structured recommendations");
    }

    const recommendations = JSON.parse(toolCall.function.arguments);
    console.log("Parsed recommendations:", recommendations);

    return new Response(
      JSON.stringify({ 
        recommendations: recommendations.lessons,
        playerStats: {
          rating: analysis.rating,
          totalGames: analysis.totalGames,
          winRate: analysis.winRate
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in recommend-lessons function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
