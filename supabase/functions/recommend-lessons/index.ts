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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch player stats
    const { data: stats } = await supabase
      .from("player_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Fetch recent game analyses
    const { data: analyses } = await supabase
      .from("game_analysis")
      .select("strengths, weaknesses, suggestions")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Aggregate weaknesses
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

    // Call Lovable AI for personalized recommendations
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `You are a chess learning advisor. Based on player statistics and game analysis, recommend personalized learning topics and provide a tailored learning path.

Focus on:
1. Addressing identified weaknesses
2. Building on existing strengths
3. Progressive difficulty
4. Comprehensive skill development

Return structured recommendations using the provided tool.`;

    const userPrompt = `Analyze this player's profile and recommend personalized lessons:

Player Statistics:
- Total Games: ${stats?.total_games || 0}
- Win Rate: ${stats?.win_rate?.toFixed(1) || 0}%
- Wins: ${stats?.wins || 0}
- Losses: ${stats?.losses || 0}

Top Weaknesses (from recent games):
${topWeaknesses.length > 0 ? topWeaknesses.join('\n') : 'No weaknesses identified yet'}

Recent Suggestions:
${analyses?.map((a: any) => a.suggestions).filter(Boolean).slice(0, 2).join('\n') || 'No suggestions yet'}

Provide 5-7 personalized lesson recommendations that will help this player improve.`;

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
            name: "provide_recommendations",
            description: "Provide personalized lesson recommendations",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      difficulty: { 
                        type: "string",
                        enum: ["beginner", "intermediate", "advanced"]
                      },
                      category: { type: "string" },
                      priority: { 
                        type: "number",
                        description: "Priority from 1 (highest) to 5 (lowest)"
                      },
                      reasoning: { 
                        type: "string",
                        description: "Why this lesson is recommended for this player"
                      }
                    }
                  },
                  description: "List of 5-7 personalized lesson recommendations"
                },
                learning_path_summary: {
                  type: "string",
                  description: "Brief overview of the recommended learning path"
                }
              },
              required: ["recommendations", "learning_path_summary"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "provide_recommendations" } }
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
      throw new Error("No recommendations returned from AI");
    }

    const recommendations = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(recommendations),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("recommend-lessons error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
