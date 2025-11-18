import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PromotionDialogProps {
  open: boolean;
  onSelect: (piece: string) => void;
  onCancel: () => void;
}

export const PromotionDialog = ({ open, onSelect, onCancel }: PromotionDialogProps) => {
  const pieces = [
    { value: 'q', label: 'Queen', symbol: '♕' },
    { value: 'r', label: 'Rook', symbol: '♖' },
    { value: 'b', label: 'Bishop', symbol: '♗' },
    { value: 'n', label: 'Knight', symbol: '♘' },
  ];

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote Pawn</DialogTitle>
          <DialogDescription>
            Choose which piece to promote your pawn to
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {pieces.map((piece) => (
            <Button
              key={piece.value}
              variant="outline"
              size="lg"
              className="h-24 flex-col gap-2"
              onClick={() => onSelect(piece.value)}
            >
              <span className="text-4xl">{piece.symbol}</span>
              <span className="text-sm">{piece.label}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};