import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

export type PrincipleDemoData = {
  /** Starting FEN. Defaults to standard initial position. */
  fen?: string;
  /** SAN move list to play through, in order. */
  moves: string[];
  /** Short text describing what the animation shows. */
  caption?: string;
  /** Board orientation. Defaults to 'white'. */
  orientation?: 'white' | 'black';
  /** Delay between moves in ms. Defaults to 1100. */
  intervalMs?: number;
};

/**
 * A small auto-playing chess board that animates a sequence of moves to
 * illustrate a chess principle. Loops continuously; can be paused / reset.
 */
export const PrincipleDemo = ({ demo }: { demo: PrincipleDemoData }) => {
  const startFen = demo.fen ?? new Chess().fen();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const interval = demo.intervalMs ?? 1100;

  const fen = useMemo(() => {
    const c = new Chess(startFen);
    for (let i = 0; i < index; i++) {
      try {
        c.move(demo.moves[i]);
      } catch {
        // Skip invalid moves silently so a typo can't crash the UI
      }
    }
    return c.fen();
  }, [index, startFen, demo.moves]);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(
      () => {
        setIndex((i) => (i >= demo.moves.length ? 0 : i + 1));
      },
      index === 0 ? 700 : index >= demo.moves.length ? 1600 : interval,
    );
    return () => clearTimeout(t);
  }, [index, playing, interval, demo.moves.length]);

  return (
    <div className="space-y-2 mt-3 p-3 rounded-lg bg-background/40 border border-border/50">
      <div className="max-w-[260px] mx-auto">
        <Chessboard
          position={fen}
          boardOrientation={demo.orientation ?? 'white'}
          arePiecesDraggable={false}
          customBoardStyle={{
            borderRadius: 6,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
          customDarkSquareStyle={{ backgroundColor: 'hsl(var(--primary))' }}
          customLightSquareStyle={{ backgroundColor: 'hsl(var(--card))' }}
        />
      </div>
      <div className="flex items-center justify-center gap-1 text-xs">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => {
            setIndex(0);
            setPlaying(true);
          }}
          aria-label="Restart"
        >
          <RotateCcw className="w-3 h-3" />
        </Button>
        <span className="text-muted-foreground tabular-nums">
          Move {Math.min(index, demo.moves.length)}/{demo.moves.length}
        </span>
      </div>
      {demo.caption && (
        <p className="text-xs text-center text-muted-foreground italic px-2">
          {demo.caption}
        </p>
      )}
    </div>
  );
};

export default PrincipleDemo;
