import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Chess } from "https://esm.sh/chess.js@1.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fen, move } = await req.json();

    console.log('Validating move:', move, 'for FEN:', fen);

    const game = new Chess(fen);
    
    // Attempt the move
    const result = game.move(move);

    if (!result) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid move' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check game state
    const gameState = {
      fen: game.fen(),
      isCheck: game.isCheck(),
      isCheckmate: game.isCheckmate(),
      isDraw: game.isDraw(),
      isStalemate: game.isStalemate(),
      isThreefoldRepetition: game.isThreefoldRepetition(),
      isInsufficientMaterial: game.isInsufficientMaterial(),
      turn: game.turn(),
      moveNumber: game.moveNumber(),
      history: game.history()
    };

    console.log('Move validated successfully:', gameState);

    return new Response(
      JSON.stringify({
        valid: true,
        result,
        gameState
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: (error as Error).message 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
