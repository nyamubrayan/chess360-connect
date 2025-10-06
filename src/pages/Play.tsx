import { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, RotateCcw, Lightbulb, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Play = () => {
  const navigate = useNavigate();
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  const makeAMove = (move: { from: string; to: string; promotion?: string }) => {
    try {
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);
      
      if (result) {
        setGame(gameCopy);
        setMoveHistory([...moveHistory, result.san]);
        
        if (gameCopy.isCheckmate()) {
          toast.success("Checkmate! You won!");
          return;
        }
        
        if (gameCopy.isCheck()) {
          toast("Check!");
        }
        
        // Make random AI move after a delay
        setTimeout(() => makeRandomMove(gameCopy), 300);
      }
      return result;
    } catch (error) {
      toast.error("Invalid move!");
      return null;
    }
  };

  const makeRandomMove = (currentGame: Chess) => {
    const possibleMoves = currentGame.moves();
    
    if (possibleMoves.length === 0) return;

    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    const move = possibleMoves[randomIndex];
    
    currentGame.move(move);
    setGame(new Chess(currentGame.fen()));
    setMoveHistory([...moveHistory, move]);

    if (currentGame.isCheckmate()) {
      toast.error("Checkmate! AI won!");
    } else if (currentGame.isCheck()) {
      toast("Check!");
    }
  };

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    return move !== null;
  };

  const resetGame = () => {
    setGame(new Chess());
    setMoveHistory([]);
    toast("Game reset!");
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="secondary" 
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Play vs AI</h1>
          <div className="w-24"></div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chess Board */}
          <div className="lg:col-span-2">
            <Card className="gradient-card p-6 glow-primary">
              <div className="aspect-square max-w-2xl mx-auto">
                <Chessboard
                  boardWidth={600}
                  {...({position: game.fen()} as any)}
                  {...({onPieceDrop: onDrop} as any)}
                />
              </div>
              
              {/* Controls */}
              <div className="flex gap-3 mt-6 justify-center">
                <Button 
                  variant="secondary" 
                  onClick={resetGame}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
                <Button 
                  variant="secondary" 
                  className="gap-2"
                >
                  <Lightbulb className="w-4 h-4" />
                  Hint
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Move History */}
            <Card className="gradient-card p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Move History
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {moveHistory.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No moves yet</p>
                ) : (
                  moveHistory.map((move, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-3 text-sm py-2 px-3 rounded bg-muted/30"
                    >
                      <span className="text-muted-foreground font-mono">
                        {Math.floor(index / 2) + 1}.
                      </span>
                      <span className="font-medium">{move}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Game Info */}
            <Card className="gradient-card p-6">
              <h3 className="text-xl font-bold mb-4">Game Status</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Turn</span>
                  <span className="font-medium">
                    {game.turn() === 'w' ? 'White (You)' : 'Black (AI)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Moves</span>
                  <span className="font-medium">{moveHistory.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check</span>
                  <span className="font-medium">
                    {game.isCheck() ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Play;
