import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fen, lastMove, playerColor } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Analyzing move: ${lastMove} for ${playerColor} player`);
    console.log(`Current position (FEN): ${fen}`);

    // Prepare prompt for AI analysis
    const systemPrompt = `You are a chess mentor analyzing moves in real-time. Provide concise, actionable feedback.
Your analysis should be helpful and educational, not discouraging.

Evaluate the move and position, then respond with:
1. A brief evaluation of the current position (1-2 sentences)
2. If the move wasn't optimal, suggest a better alternative
3. Explain the reasoning in simple terms (2-3 sentences max)
4. Classify the move as: "good", "questionable", "mistake", or "blunder"

Be encouraging and focus on learning opportunities.`;

    const userPrompt = `Position (FEN): ${fen}
Last move: ${lastMove}
Player color: ${playerColor}

Analyze this move and provide feedback.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_move",
              description: "Analyze a chess move and provide feedback",
              parameters: {
                type: "object",
                properties: {
                  evaluation: {
                    type: "string",
                    description: "Brief evaluation of the position (1-2 sentences)"
                  },
                  suggestion: {
                    type: "string",
                    description: "Better move suggestion if applicable (empty if move is good)"
                  },
                  explanation: {
                    type: "string",
                    description: "Simple explanation of the reasoning (2-3 sentences)"
                  },
                  type: {
                    type: "string",
                    enum: ["good", "questionable", "mistake", "blunder"],
                    description: "Classification of the move quality"
                  }
                },
                required: ["evaluation", "suggestion", "explanation", "type"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_move" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract structured output from tool call
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log("Analysis result:", analysis.type);

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in analyze-move function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
