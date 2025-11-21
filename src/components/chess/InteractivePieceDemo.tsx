import { useState } from 'react';
import { toast } from 'sonner';

interface InteractivePieceDemoProps {
  pieceName: string;
  pieceSymbol: string;
}

export const InteractivePieceDemo = ({ pieceName, pieceSymbol }: InteractivePieceDemoProps) => {
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const centerSquare = 12; // Center of 5x5 grid (index 12)

  const isValidMove = (squareIndex: number): boolean => {
    const row = Math.floor(squareIndex / 5);
    const col = squareIndex % 5;
    const centerRow = Math.floor(centerSquare / 5);
    const centerCol = centerSquare % 5;
    
    if (squareIndex === centerSquare) return false;

    switch (pieceName) {
      case 'King':
        return Math.abs(row - centerRow) <= 1 && Math.abs(col - centerCol) <= 1;
      
      case 'Queen':
        return row === centerRow || col === centerCol || Math.abs(row - centerRow) === Math.abs(col - centerCol);
      
      case 'Rook':
        return row === centerRow || col === centerCol;
      
      case 'Bishop':
        return Math.abs(row - centerRow) === Math.abs(col - centerCol);
      
      case 'Knight':
        const rowDiff = Math.abs(row - centerRow);
        const colDiff = Math.abs(col - centerCol);
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
      
      case 'Pawn':
        return (col === centerCol && row === centerRow - 1) || 
               (col === centerCol && row === centerRow - 2) ||
               ((col === centerCol - 1 || col === centerCol + 1) && row === centerRow - 1);
      
      default:
        return false;
    }
  };

  const handleSquareClick = (squareIndex: number) => {
    if (squareIndex === centerSquare) {
      toast.info('Click on other squares to test valid moves!');
      return;
    }

    const isValid = isValidMove(squareIndex);
    setSelectedSquare(squareIndex);

    if (isValid) {
      toast.success('Valid move! ✓', {
        description: `The ${pieceName} can move to this square.`
      });
    } else {
      toast.error('Invalid move! ✗', {
        description: `The ${pieceName} cannot move to this square.`
      });
    }

    setTimeout(() => setSelectedSquare(null), 1000);
  };

  return (
    <div className="w-full lg:w-64 flex-shrink-0">
      <div className="bg-muted/10 p-2 rounded-lg">
        <div className="grid grid-cols-5 gap-0.5 w-full aspect-square">
          {Array.from({ length: 25 }, (_, i) => {
            const row = Math.floor(i / 5);
            const col = i % 5;
            const isCenter = i === centerSquare;
            const isValid = isValidMove(i);
            const isSelected = i === selectedSquare;
            
            return (
              <button
                key={i}
                onClick={() => handleSquareClick(i)}
                className={`aspect-square flex items-center justify-center text-2xl rounded-sm transition-all duration-300 cursor-pointer hover:scale-105 ${
                  (row + col) % 2 === 0 ? 'bg-background' : 'bg-primary/20'
                } ${
                  isCenter 
                    ? 'animate-pulse cursor-default' 
                    : isValid 
                    ? 'hover:bg-primary/50' 
                    : 'hover:bg-destructive/30'
                } ${
                  isSelected && isValid
                    ? 'bg-primary animate-scale-in'
                    : isSelected && !isValid
                    ? 'bg-destructive animate-scale-in'
                    : ''
                } ${
                  !isCenter && isValid ? 'ring-1 ring-primary/30 ring-inset' : ''
                }`}
                disabled={isCenter}
              >
                {isCenter && <span className="animate-scale-in">{pieceSymbol}</span>}
                {!isCenter && isValid && !isSelected && (
                  <span className="text-xs text-primary opacity-40">•</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Click any square to test if it's a valid move
        </p>
      </div>
    </div>
  );
};
