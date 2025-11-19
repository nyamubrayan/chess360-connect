import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Flag, HandshakeIcon, CheckCircle, XCircle, Undo2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface GameControlsProps {
  game: any;
  playerColor: 'white' | 'black' | null;
  onResign: () => void;
  onOfferDraw: () => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  onRequestTakeback: () => void;
  onAcceptTakeback: () => void;
  onDeclineTakeback: () => void;
  className?: string;
}

export const GameControls = ({
  game,
  playerColor,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onRequestTakeback,
  onAcceptTakeback,
  onDeclineTakeback,
  className,
}: GameControlsProps) => {
  const isActive = game.status === 'active';
  const drawOfferedByOpponent = game.draw_offered_by && 
    ((playerColor === 'white' && game.draw_offered_by === game.black_player_id) ||
     (playerColor === 'black' && game.draw_offered_by === game.white_player_id));
  
  const takebackRequestedByOpponent = game.undo_requested_by && 
    ((playerColor === 'white' && game.undo_requested_by === game.black_player_id) ||
     (playerColor === 'black' && game.undo_requested_by === game.white_player_id));

  return (
    <Card className={`gradient-card p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Resign Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 gap-2"
              disabled={!isActive}
            >
              <Flag className="w-4 h-4" />
              Resign
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Resign Game?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to resign? This will end the game and you will lose.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onResign}>Resign</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Draw Offer/Response */}
        {drawOfferedByOpponent ? (
          <>
            <Button
              variant="default"
              size="sm"
              className="flex-1 gap-2"
              onClick={onAcceptDraw}
            >
              <CheckCircle className="w-4 h-4" />
              Accept Draw
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={onDeclineDraw}
            >
              <XCircle className="w-4 h-4" />
              Decline
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={onOfferDraw}
            disabled={!isActive || !!game.draw_offered_by}
          >
            <HandshakeIcon className="w-4 h-4" />
            {game.draw_offered_by ? 'Draw Offered' : 'Offer Draw'}
          </Button>
        )}

        {/* Takeback Request/Response */}
        {takebackRequestedByOpponent ? (
          <>
            <Button
              variant="default"
              size="sm"
              className="flex-1 gap-2"
              onClick={onAcceptTakeback}
            >
              <CheckCircle className="w-4 h-4" />
              Accept Takeback
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={onDeclineTakeback}
            >
              <XCircle className="w-4 h-4" />
              Decline
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={onRequestTakeback}
            disabled={!isActive || !!game.undo_requested_by || game.move_count === 0}
          >
            <Undo2 className="w-4 h-4" />
            {game.undo_requested_by ? 'Takeback Requested' : 'Request Takeback'}
          </Button>
        )}
      </div>
    </Card>
  );
};