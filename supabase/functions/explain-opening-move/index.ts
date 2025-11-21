import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { openingName, move, moveNumber, previousMoves, keyIdeas, isEndgame } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = isEndgame 
      ? `You are a chess coach explaining endgame techniques to students. Provide clear, concise explanations (2-3 sentences) that help students understand WHY this move is played and what it accomplishes in the endgame. Focus on endgame principles, key squares, winning techniques, and defensive resources.`
      : `You are a chess coach explaining opening moves to students. Provide clear, concise explanations (2-3 sentences) that help students understand WHY this move is played and what it accomplishes. Focus on practical understanding, not just theory.`;

    const userPrompt = isEndgame
      ? `Endgame Position: ${openingName}
Move ${moveNumber}: ${move}
Previous moves: ${previousMoves.join(", ")}

Key concepts for this endgame:
${keyIdeas.map((idea: string, i: number) => `${i + 1}. ${idea}`).join("\n")}

Explain why this move (${move}) is the correct technique in this endgame position. What does it accomplish? How does it fit into the winning plan or defensive strategy?`
      : `Opening: ${openingName}
Move ${moveNumber}: ${move}
Previous moves: ${previousMoves.join(", ")}

Key ideas of this opening:
${keyIdeas.map((idea: string, i: number) => `${i + 1}. ${idea}`).join("\n")}

Explain why this move (${move}) is played in this position. What does it accomplish? How does it fit into the opening's plan?`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate explanation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content || "Unable to generate explanation.";

    return new Response(
      JSON.stringify({ explanation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in explain-opening-move function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
