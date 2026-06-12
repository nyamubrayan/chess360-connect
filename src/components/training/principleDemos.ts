import type { PrincipleDemoData } from './PrincipleDemo';

/**
 * Hand-picked animated demonstrations for select principles. Not every
 * principle has a demo — only the ones where a short move sequence on the
 * board makes the idea concrete.
 */
export const principleDemos: Record<number, PrincipleDemoData> = {
  1: {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd3', 'O-O'],
    caption: 'Both sides develop minor pieces and castle quickly.',
  },
  2: {
    moves: ['Nf3', 'Nf6', 'Nc3', 'Nc6', 'e3', 'e6', 'Bd3', 'Bd6'],
    caption: 'Knights come out first, bishops follow once the path is clear.',
  },
  9: {
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1',
    moves: ['O-O', 'O-O'],
    caption: 'Tuck both kings safely behind the kingside pawns.',
    intervalMs: 1500,
  },
  15: {
    moves: ['e4', 'e5', 'd4', 'exd4', 'Nf3'],
    caption: 'White stakes a claim in the centre with pawns.',
  },
  16: {
    fen: '7k/8/8/8/8/8/N7/K7 w - - 0 1',
    moves: ['Nb4', 'Kg8', 'Nd5', 'Kf8', 'Nf6', 'Ke7'],
    caption: 'The knight gains squares as it heads for the centre.',
  },
  29: {
    fen: '8/4k3/8/8/4P3/4K3/8/8 w - - 0 1',
    moves: ['Kd4', 'Kd6', 'e5+', 'Ke6', 'Ke4'],
    caption: 'A passed pawn pushes forward, escorted by its king.',
  },
  36: {
    fen: '4k3/8/8/8/8/8/8/R3K3 w Q - 0 1',
    moves: ['Ra7', 'Kd8', 'Rb7', 'Kc8', 'Rh7'],
    caption: 'The rook invades the 7th rank and dominates.',
  },
  39: {
    fen: '7k/8/8/8/8/8/N7/K7 w - - 0 1',
    moves: ['Nb4', 'Kg8', 'Nd5', 'Kf8'],
    caption: 'A central knight reaches up to 8 squares.',
  },
  88: {
    fen: '8/8/8/8/8/8/8/K6k w - - 0 1',
    moves: ['Kb2', 'Kg2', 'Kc3', 'Kf3', 'Kd4', 'Kf4'],
    caption: 'In the endgame the king marches to the centre.',
  },
  91: {
    fen: '4k3/8/4K3/4P3/8/8/8/8 b - - 0 1',
    moves: ['Kd8', 'Kd6', 'Ke8', 'e6', 'Kf8', 'e7+', 'Kf7', 'Kd7'],
    caption: 'White wins the opposition and escorts the pawn home.',
  },
};

export const hasDemo = (n: number) => n in principleDemos;
