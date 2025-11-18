import { Chessboard } from 'react-chessboard';
import { Square } from 'chess.js';

interface ChessBoardProps {
  position: string;
  onMove: (from: string, to: string) => void;
  playerColor: 'white' | 'black' | null;
  disabled?: boolean;
}

export const ChessBoardComponent = ({ position, onMove, playerColor, disabled }: ChessBoardProps) => {
  const handleDrop = (sourceSquare: Square, targetSquare: Square) => {
    if (disabled) return false;
    onMove(sourceSquare, targetSquare);
    return true;
  };

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <Chessboard
        position={position}
        onPieceDrop={handleDrop}
        boardOrientation={playerColor || 'white'}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        }}
        customDarkSquareStyle={{ backgroundColor: 'hsl(var(--primary))' }}
        customLightSquareStyle={{ backgroundColor: 'hsl(var(--card))' }}
        arePiecesDraggable={!disabled}
      />
    </div>
  );
};