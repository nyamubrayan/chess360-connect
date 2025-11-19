import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MoveHistoryProps {
  moves: any[];
}

export const MoveHistory = ({ moves }: MoveHistoryProps) => {
  // Group moves by pair (white + black)
  const movePairs: any[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  // Get the last move for highlighting
  const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;

  return (
    <Card className="gradient-card p-4 h-full">
      <h3 className="text-lg font-bold mb-4">Move History</h3>
      <ScrollArea className="h-[400px] lg:h-[600px]">
        {movePairs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No moves yet
          </p>
        ) : (
          <div className="space-y-1">
            {movePairs.map((pair) => (
              <div
                key={pair.number}
                className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 transition-colors text-sm"
              >
                <span className="font-medium text-muted-foreground w-8">
                  {pair.number}.
                </span>
                <div className="flex-1 flex gap-4">
                  <span 
                    className={`flex-1 font-mono ${
                      pair.white?.id === lastMove?.id 
                        ? 'bg-primary/20 px-2 py-1 rounded font-bold' 
                        : ''
                    }`}
                  >
                    {pair.white?.move_san}
                  </span>
                  {pair.black && (
                    <span 
                      className={`flex-1 font-mono ${
                        pair.black?.id === lastMove?.id 
                          ? 'bg-primary/20 px-2 py-1 rounded font-bold' 
                          : ''
                      }`}
                    >
                      {pair.black.move_san}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};