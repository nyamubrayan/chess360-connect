// Chessafari AI - chess-only assistant with site DB context
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull lightweight site context from DB so AI can reference platform data
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let siteContext = "";
    try {
      const [topPlayers, activeGames, recentNews, tournaments] = await Promise.all([
        supabase.from("profiles").select("username,display_name,rapid_rating,blitz_rating,bullet_rating").order("rapid_rating", { ascending: false }).limit(5),
        supabase.from("games").select("id,status,time_control").eq("status", "active").limit(3),
        supabase.from("news_articles").select("title,summary").order("created_at", { ascending: false }).limit(3),
        supabase.from("tournaments").select("name,status,start_time").order("start_time", { ascending: false }).limit(3),
      ]);

      siteContext = `
CHESSAFARI PLATFORM LIVE DATA:
Top Players: ${JSON.stringify(topPlayers.data ?? [])}
Active Games: ${activeGames.data?.length ?? 0}
Recent News: ${JSON.stringify(recentNews.data ?? [])}
Tournaments: ${JSON.stringify(tournaments.data ?? [])}
`;
    } catch (_) { /* DB context optional */ }

    const systemPrompt = `You are Chessafari AI, a chess-only assistant on the Chessafari platform.

STRICT RULES:
1. You ONLY discuss chess: rules, strategy, openings, tactics, endgames, history, famous players, puzzles, analysis, training, and the Chessafari platform itself.
2. If the user asks ANYTHING unrelated to chess (coding, life advice, other games, jokes, math, etc.), reply EXACTLY:
   "I'm only trained for chess. Ask me anything about chess — openings, tactics, endgames, or the Chessafari platform!"
3. Use the live Chessafari platform data below when relevant (top players, tournaments, news, active games).
4. Be concise, friendly, and use chess notation when helpful.

${siteContext}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: text }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
