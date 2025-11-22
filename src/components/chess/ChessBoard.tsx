import { Chessboard } from 'react-chessboard';
import { Square, Chess } from 'chess.js';
import { useState, useEffect } from 'react';

interface ChessBoardProps {
  position: string;
  onMove: (from: string, to: string) => void;
  playerColor: 'white' | 'black' | null;
  disabled?: boolean;
  chess: Chess;
  lastMove?: { from: string; to: string } | null;
}

export const ChessBoardComponent = ({ position, onMove, playerColor, disabled, chess, lastMove }: ChessBoardProps) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);

  useEffect(() => {
    // Clear highlights when position changes
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [position]);

  const handleSquareClick = (square: Square) => {
    if (disabled) return;

    // If clicking the same square, deselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // If a square is already selected, try to move
    if (selectedSquare) {
      onMove(selectedSquare, square);
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // Select a new piece and show legal moves
    const piece = chess.get(square);
    if (piece && piece.color === (playerColor === 'white' ? 'w' : 'b')) {
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setLegalMoves(moves.map(move => move.to as Square));
    }
  };

  const handleDrop = (sourceSquare: Square, targetSquare: Square) => {
    if (disabled) return false;
    onMove(sourceSquare, targetSquare);
    setSelectedSquare(null);
    setLegalMoves([]);
    return true;
  };

  const customSquareStyles: Record<string, React.CSSProperties> = {};
  
  // Highlight last move squares with border (won't be overridden)
  if (lastMove) {
    customSquareStyles[lastMove.from] = {
      backgroundColor: 'rgba(255, 255, 0, 0.35)',
      boxShadow: 'inset 0 0 0 3px rgba(255, 255, 0, 0.7)',
    };
    customSquareStyles[lastMove.to] = {
      backgroundColor: 'rgba(255, 255, 0, 0.35)',
      boxShadow: 'inset 0 0 0 3px rgba(255, 255, 0, 0.7)',
    };
  }
  
  // Highlight selected square (overrides last move highlight if same square)
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = {
      backgroundColor: 'rgba(255, 255, 0, 0.5)',
      boxShadow: 'inset 0 0 0 4px rgba(255, 255, 0, 1)',
    };
  }

  // Highlight legal move squares (add to existing styles)
  legalMoves.forEach(square => {
    const existingStyle = customSquareStyles[square] || {};
    customSquareStyles[square] = {
      ...existingStyle,
      background: existingStyle.backgroundColor 
        ? `${existingStyle.backgroundColor}, radial-gradient(circle, rgba(0, 255, 0, 0.5) 25%, transparent 25%)`
        : 'radial-gradient(circle, rgba(0, 255, 0, 0.5) 25%, transparent 25%)',
    };
  });

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <Chessboard
        position={position}
        onPieceDrop={handleDrop}
        onSquareClick={handleSquareClick}
        boardOrientation={playerColor || 'white'}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        }}
        customDarkSquareStyle={{ backgroundColor: 'hsl(var(--primary))' }}
        customLightSquareStyle={{ backgroundColor: 'hsl(var(--card))' }}
        customSquareStyles={customSquareStyles}
        arePiecesDraggable={!disabled}
      />
    </div>
  );
};