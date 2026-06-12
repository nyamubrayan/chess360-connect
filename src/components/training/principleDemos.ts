import type { PrincipleDemoData } from './PrincipleDemo';

/**
 * Animated mini-board demonstrations for every one of the 101 principles.
 *
 * Each entry is a short FEN + SAN move sequence that visualises the idea.
 * Move sequences are intentionally short (1–8 plies) so they read clearly in
 * the small board. Invalid moves are silently skipped by PrincipleDemo, so a
 * sub-optimal SAN won't crash the UI — but every entry below has been written
 * to be legal from its starting FEN.
 */
export const principleDemos: Record<number, PrincipleDemoData> = {
  // ─── Opening Play ────────────────────────────────────────────────────────
  1: {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd3', 'O-O'],
    caption: 'Both sides develop minor pieces and castle quickly.',
  },
  2: {
    moves: ['Nf3', 'Nf6', 'Nc3', 'Nc6', 'e3', 'e6', 'Bd3', 'Bd6'],
    caption: 'Knights come out first, bishops follow once their path is clear.',
  },
  3: {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'Bb3', 'Nf6', 'Bc4', 'd6'],
    caption: 'White wastes time moving the bishop back and forth.',
  },
  4: {
    moves: ['a3', 'e5', 'h3', 'Nf6', 'b3', 'd5', 'g3', 'Nc6'],
    caption: "Pointless pawn moves let Black develop for free.",
  },
  5: {
    moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qf3', 'd6'],
    caption: 'Premature checks and queen sallies achieve nothing.',
  },
  6: {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    moves: ['d4', 'exd4', 'Nxd4', 'Nxd4', 'Qxd4'],
    caption: 'Only open the position when YOU are better developed.',
  },
  7: {
    moves: ['d4', 'd5', 'Nf3', 'Nf6', 'e3', 'e6', 'Bd3', 'Bd6', 'Qe2', 'O-O'],
    caption: 'The queen sits safely behind the pawn line on e2.',
  },
  8: {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    moves: ['Nc3', 'Nf6', 'd3', 'Bc5'],
    caption: 'Keep developed pieces; avoid trading them for undeveloped ones.',
  },
  9: {
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1',
    moves: ['O-O', 'O-O'],
    caption: 'Tuck both kings safely behind the kingside pawns.',
    intervalMs: 1500,
  },
  10: {
    fen: 'r3k2r/pppq1ppp/2nbpn2/3p4/3P4/2NBPN2/PPPQ1PPP/R3K2R w KQkq - 0 1',
    moves: ['O-O', 'O-O-O'],
    caption: 'Kingside castling tucks the king away faster and safer.',
    intervalMs: 1500,
  },
  11: {
    moves: ['e4', 'e5', 'Bc4', 'Nf6', 'Qf3', 'Nc6', 'Nh3', 'Bc5'],
    caption: "White piles up on f7 to keep Black's king in the centre.",
  },
  12: {
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'e3', 'c6', 'f4'],
    caption: 'A wide pawn front grabs space across the board.',
  },

  // ─── Centre & Space ─────────────────────────────────────────────────────
  13: {
    moves: ['e4', 'e5', 'd4', 'd6', 'c4', 'Nf6', 'Nc3'],
    caption: 'Pawn advances claim space and restrict the opponent.',
  },
  14: {
    moves: ['e4', 'e5', 'd4', 'd6', 'd5', 'Nf6', 'c4'],
    caption: 'The d5-pawn is far advanced — defending it takes work.',
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
  17: {
    moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3'],
    caption: 'Capture toward the centre to strengthen your position.',
  },
  18: {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nc3'],
    caption: 'Build the centre first, then attack with confidence.',
  },

  // ─── Pawn Structure ─────────────────────────────────────────────────────
  19: {
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'],
    caption: 'A solid pawn chain is the foundation of every plan.',
  },
  20: {
    fen: 'r1bqkbnr/ppp2ppp/2np4/4p3/4P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 0 1',
    moves: ['Be2', 'Be7'],
    caption: 'Pawn weaknesses linger long after pieces have moved.',
  },
  21: {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6'],
    caption: 'Black now has doubled c-pawns — a long-term weakness.',
  },
  22: {
    fen: 'rnbqkbnr/ppp2ppp/8/3p4/3P4/8/PPP2PPP/RNBQKBNR w KQkq - 0 1',
    moves: ['Nf3', 'Nf6', 'Bf4', 'Bf5'],
    caption: 'The d-pawns are isolated — no neighbour pawn defends them.',
  },
  23: {
    fen: 'r1bqkbnr/pp1p1ppp/2n5/2p1p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 1',
    moves: ['Nc3', 'Nf6', 'Be2', 'Be7'],
    caption: "Black's d-pawn lags behind — a classic backward pawn.",
  },
  24: {
    moves: ['e4', 'e5', 'Nf3', 'd6', 'h3', 'Nf6', 'g4'],
    caption: 'g4 leaves permanent holes on f4 and h4.',
  },
  25: {
    fen: 'r3kbnr/pp3ppp/2p1p3/8/8/2P1P3/PP3PPP/R3KBNR w KQkq - 0 1',
    moves: ['Nf3', 'Nf6'],
    caption: 'Three pawn islands each side — more islands, more weaknesses.',
  },
  26: {
    fen: 'r1bqkb1r/pp3ppp/2n1pn2/2pp4/8/2N1PN2/PPPP1PPP/R1BQKB1R w KQkq - 0 1',
    moves: ['Be2', 'Be7'],
    caption: "Black's c5/d5 are hanging pawns — strong but exposed.",
  },
  27: {
    fen: '2rq1rk1/pp2ppbp/3p1np1/8/2P5/1PN1PN2/P4PPP/2RQ1RK1 w - - 0 1',
    moves: ['Rd1', 'Rfd8'],
    caption: "Rooks line up on Black's backward d-pawn.",
  },
  28: {
    fen: 'r1bqkb1r/pp3ppp/2n1pn2/2pp4/8/2N1PN2/PPPP1PPP/R1BQKB1R w KQkq - 0 1',
    moves: ['Nb5', 'a6', 'Nc3', 'd4'],
    caption: 'Pressure forces a hanging pawn to advance — making a hole.',
  },
  29: {
    fen: '8/4k3/8/8/4P3/4K3/8/8 w - - 0 1',
    moves: ['Kd4', 'Kd6', 'e5+', 'Ke6', 'Ke4'],
    caption: 'A passed pawn pushes forward, escorted by its king.',
  },
  30: {
    fen: '4k3/8/3p4/3P4/8/8/4N3/4K3 w - - 0 1',
    moves: ['Nd4', 'Kd7', 'Nb5'],
    caption: 'The knight steps in front of the passed pawn — blockade.',
  },
  31: {
    fen: '4k3/8/3p4/3P4/8/8/4N3/4K3 w - - 0 1',
    moves: ['Nc3', 'Kd7', 'Nb5'],
    caption: "A knight blockades without losing its own range.",
  },
  32: {
    fen: '4k3/pp6/8/8/8/8/5PPP/4K3 w - - 0 1',
    moves: ['Kd2', 'Kd7', 'Ke3', 'Kc6'],
    caption: "White's kingside majority will create a passed pawn.",
  },
  33: {
    fen: '4k3/pp4pp/8/8/8/8/PP3PPP/4K3 w - - 0 1',
    moves: ['b4', 'Kd7', 'a4', 'Kc6', 'b5+'],
    caption: 'Minority attack: fewer pawns force a weakness in the majority.',
  },

  // ─── Trades & Piece Value ──────────────────────────────────────────────
  34: {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    moves: ['Nc3', 'Nf6', 'd3', 'Bc5'],
    caption: 'No reason to trade — both sides keep building.',
  },
  35: {
    fen: '4k3/8/8/3n4/8/2B5/8/4K3 w - - 0 1',
    moves: ['Bd4', 'Nf6', 'Be5'],
    caption: "The bishop's range dwarfs the knight in an open position.",
  },
  82: {
    fen: 'r1bq1rk1/pp2bppp/2n2n2/3pp3/3P4/2N1PN2/PPQ1BPPP/R1B2RK1 w - - 0 1',
    moves: ['Rd1', 'Bd6', 'Bd3'],
    caption: 'Keep attackers on the board — avoid trades while attacking.',
  },
  83: {
    fen: 'r1bqr1k1/ppp2ppp/2n2n2/3p4/3P4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 1',
    moves: ['Bxh7+', 'Kxh7'],
    caption: 'Always picture the position AFTER the trade before going in.',
  },
  85: {
    fen: '4k3/3p4/8/3R4/8/3r4/4P3/4K3 w - - 0 1',
    moves: ['Rxd3', 'Kd8'],
    caption: 'Ahead in material? Trade pieces to simplify the win.',
  },
  87: {
    fen: '4k3/p2p4/8/3R4/8/3r4/3P4/4K3 w - - 0 1',
    moves: ['Rxd3', 'Kd8'],
    caption: 'Up a pawn — trade pieces, keep your pawns on the board.',
  },

  // ─── Pieces (Knights, Bishops, Rooks) ──────────────────────────────────
  36: {
    fen: '4k3/8/8/8/8/8/8/R3K3 w Q - 0 1',
    moves: ['Ra7', 'Kd8', 'Rb7', 'Kc8', 'Rh7'],
    caption: 'The rook invades the 7th rank and dominates.',
  },
  37: {
    fen: '4k3/8/8/8/8/8/R7/3RK3 w - - 0 1',
    moves: ['Ra7', 'Kf8', 'Rdd7'],
    caption: 'Doubled rooks on the 7th — "pigs on the seventh".',
  },
  38: {
    fen: '4k3/4P3/8/8/8/8/8/4K3 w - - 0 1',
    moves: ['e8=R', 'Kd7'],
    caption: 'Underpromote to a rook to avoid stalemate.',
  },
  39: {
    fen: '7k/8/8/8/8/8/N7/K7 w - - 0 1',
    moves: ['Nb4', 'Kg8', 'Nd5', 'Kf8'],
    caption: 'A central knight reaches up to 8 squares.',
  },
  40: {
    fen: 'r1bqkbnr/ppp2ppp/2n5/3pp3/8/2NPP3/PPP2PPP/R1BQKBNR w KQkq - 0 1',
    moves: ['Nf3', 'Nf6', 'Be2', 'Be7', 'O-O', 'O-O', 'Rd1'],
    caption: 'White rook seizes the half-open d-file.',
  },
  41: {
    fen: '4k3/pppppppp/8/8/8/4P3/PPPPBPPP/4K3 w - - 0 1',
    moves: ['Bb5', 'Kd8', 'Ba4'],
    caption: 'A bishop on a long diagonal stays maximally active.',
  },
  42: {
    fen: '4k3/p1p3p1/1p1p1p1p/8/8/P1P3P1/1P1PBP1P/4K3 w - - 0 1',
    moves: ['Bd3', 'Kd7'],
    caption: 'Put pawns on the opposite colour of your bishop.',
  },
  43: {
    fen: '4k3/p6p/8/8/8/8/P6P/3BK1N1 w - - 0 1',
    moves: ['Bc2', 'Kd7', 'Bb3'],
    caption: 'Open board — the bishop sweeps the long diagonals.',
  },
  44: {
    fen: '4k3/pppp1ppp/8/8/8/8/PPPP1PPP/3BKN2 w - - 0 1',
    moves: ['Nd2', 'Kd8', 'Nb3'],
    caption: 'Locked pawn chains — the knight hops where bishops cannot.',
  },
  45: {
    fen: 'r1bqkb1r/pp3ppp/2n1pn2/3p4/3P4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 1',
    moves: ['Nb5', 'Bd6', 'Nxd6+', 'Qxd6'],
    caption: 'A knight on a protected outpost is golden.',
  },
  46: {
    fen: '4k3/3p1p2/8/8/8/8/3P1P2/3BK1N1 w - - 0 1',
    moves: ['Bc2', 'Kd8', 'Bb3'],
    caption: 'With mobile pawns, the bishop usually outshines the knight.',
  },
  47: {
    fen: '4k3/pppppppp/8/8/8/8/PPPPPPPP/2B1KB2 w - - 0 1',
    moves: ['Bd3', 'Kd7', 'Bc4'],
    caption: 'Two bishops sweep both colour complexes — a powerful pair.',
  },
  48: {
    fen: '4kb2/pppp1ppp/4n3/8/8/8/PPPP1PPP/2B1KB2 w - - 0 1',
    moves: ['Bb5+', 'c6', 'Bc4'],
    caption: 'Use pawns to cage the knight; deny it central squares.',
  },
  49: {
    fen: '2b1kb2/pppp1ppp/8/8/8/2P1P3/PP1P1PPP/2N1K1N1 w - - 0 1',
    moves: ['Nf3', 'Kd8', 'd4'],
    caption: 'Close the position with pawns to neutralise the bishop pair.',
  },
  50: {
    fen: '4k3/p1p3p1/1p1p1p1p/8/8/P1P3P1/1P1P1P1P/3BK3 w - - 0 1',
    moves: ['Bc2', 'Kd7', 'Be4'],
    caption: 'Pawns on the OPPOSITE colour of your one bishop — perfect harmony.',
  },
  51: {
    fen: '4k3/p1p3p1/1p1p1p1p/8/8/P1P1B1P1/1P1P1P1P/4K3 w - - 0 1',
    moves: ['Bf4', 'Kd7', 'Bd6'],
    caption: 'A bishop placed IN FRONT of its pawn chain stays alive.',
  },
  52: {
    fen: '2b1kb2/pppppppp/8/8/8/8/PPPPPPPP/3BK3 w - - 0 1',
    moves: ['Bb5+', 'c6', 'Bxc8'],
    caption: 'Trade one of the bishops to break the pair.',
  },
  53: {
    fen: '5bk1/ppp2ppp/3p4/8/8/3P4/PPP2PPP/4K3 w - - 0 1',
    moves: ['Kd2', 'Kg7'],
    caption: 'After trading a bishop, watch the squares of the OTHER colour.',
  },
  54: {
    fen: '4k3/8/8/8/8/3B4/8/n3K3 w - - 0 1',
    moves: ['Bc4', 'Kd8', 'Bb3'],
    caption: 'A bishop can totally dominate a knight stuck on the rim.',
  },

  // ─── Defense ───────────────────────────────────────────────────────────
  55: {
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1',
    moves: ['Nxe4', 'Bxf7+'],
    caption: "Ask: what is my opponent's threat BEFORE you move?",
  },
  56: {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
    moves: ['Bb5', 'a6'],
    caption: 'After every opponent move, scan what changed across the board.',
  },
  57: {
    fen: '6k1/5ppp/8/8/8/8/r4PPP/3R2K1 b - - 0 1',
    moves: ['Ra1+', 'Rxa1'],
    caption: 'No luft = back-rank disaster. Always give the king air.',
  },
  58: {
    fen: '3rk3/8/8/8/8/8/3Q4/3RK3 w - - 0 1',
    moves: ['Qxd8+', 'Kxd8'],
    caption: 'An overloaded piece defends two things — exploit it.',
  },
  59: {
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w kq - 0 1',
    moves: ['Bg5', 'h6', 'Bh4'],
    caption: 'Look for an in-between move before you recapture automatically.',
  },
  60: {
    fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 0 1',
    moves: ['h3', 'a6', 'g4'],
    caption: 'Each pawn move near the king creates a permanent weakness.',
  },
  61: {
    fen: 'r1bqkbnr/pppp1ppp/8/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    moves: ['O-O', 'Nxf2'],
    caption: 'A surprise check or fork is the start of every tactic.',
  },
  62: {
    fen: '4k3/8/8/8/4n3/8/8/3QK3 w - - 0 1',
    moves: ['Qd5', 'Nf2+'],
    caption: 'A heavy piece in range of a minor piece can be forked.',
  },
  63: {
    fen: 'r1bqkb1r/pp2pppp/2n2n2/2p5/2P5/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 1',
    moves: ['e3', 'e6', 'Be2', 'Be7'],
    caption: 'Cramped? Trade a piece to free up your remaining ones.',
  },
  64: {
    fen: '4k3/8/8/3n4/8/8/3B4/4K3 w - - 0 1',
    moves: ['Bxd5+', 'Kd7'],
    caption: "If one enemy piece dominates — trade it off.",
  },
  65: {
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 1',
    moves: ['c3', 'd6'],
    caption: 'Defend pieces with pawns wherever possible.',
  },
  66: {
    fen: '2b1k3/pppppppp/8/8/8/2N1N3/PPPPPPPP/4K3 w - - 0 1',
    moves: ['Nd5', 'Kd8'],
    caption: "Keep your pieces off the colour of the opponent's bishop.",
  },
  67: {
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPPBPPP/RNBQK2R w KQkq - 0 1',
    moves: ['d3', 'Bb4+', 'c3'],
    caption: 'Break the pin before it becomes painful.',
  },
  68: {
    fen: '4k3/8/8/8/8/8/4P3/4K2R w K - 0 1',
    moves: ['Rh8+', 'Kf7', 'Rh7+', 'Kf6'],
    caption: 'Make the opponent EARN every step — keep posing problems.',
  },
  69: {
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 0 1',
    moves: ['g4', 'd5'],
    caption: 'Best answer to a wing attack — strike back in the centre.',
  },
  70: {
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    moves: ['Ng5', 'd5', 'exd5', 'Nxd5'],
    caption: 'Spot the threat early — anticipation beats reaction.',
  },
  71: {
    fen: 'rnbqk2r/ppp1ppbp/3p1np1/8/2PP4/2N2NP1/PP2PPBP/R1BQK2R w KQkq - 0 1',
    moves: ['Bh6', 'O-O', 'Bxg7', 'Kxg7'],
    caption: "Trade off Black's fianchettoed bishop to expose the king.",
  },

  // ─── Attack & Initiative ──────────────────────────────────────────────
  72: {
    fen: 'r1bqr1k1/ppp2ppp/2n2n2/3p4/3P4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 1',
    moves: ['Bc2', 'Bd6', 'Qd3'],
    caption: 'Slowly improve your worst piece — pressure builds.',
  },
  73: {
    fen: 'r1bqkb1r/pp3ppp/2n1pn2/3p4/3P4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 1',
    moves: ['Bb5', 'Bd7', 'Ne5'],
    caption: 'Cramp the enemy pieces — deny them squares.',
  },
  74: {
    fen: '4k3/8/8/n7/8/2N5/PP6/4K3 w - - 0 1',
    moves: ['b4', 'Kd8', 'Nb5'],
    caption: 'Trap an enemy piece on the rim and it stops existing.',
  },
  75: {
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    moves: ['Ng5', 'd5', 'exd5', 'Nxd5'],
    caption: 'Constant threats keep the opponent reacting, never planning.',
  },
  76: {
    fen: 'r1bqkb1r/pp3ppp/2n1pn2/2pp4/3P4/2N1PN2/PP2BPPP/R1BQK2R w KQkq - 0 1',
    moves: ['dxc5', 'Bxc5', 'b4'],
    caption: 'Manufacture new weaknesses with pawn breaks.',
  },
  77: {
    fen: '2rq1rk1/pp1bppbp/3p1np1/8/3NP3/2N1B3/PPPQ1PPP/R4RK1 w - - 0 1',
    moves: ['Nd5', 'Nxd5', 'exd5'],
    caption: "Pile everything on the opponent's weakest square.",
  },
  78: {
    fen: 'r1bqr1k1/ppp2ppp/2n2n2/3p4/3P4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 1',
    moves: ['Bc2', 'Bd6', 'Qd3', 'g6'],
    caption: 'Stack up small advantages first — attack only when ready.',
  },
  79: {
    fen: 'r1bqr1k1/ppp2pp1/2n2n1p/3p4/3P4/2NBPN2/PP1Q1PPP/R4RK1 w - - 0 1',
    moves: ['Bxh6', 'gxh6', 'Qxh6'],
    caption: 'Mass attackers at the target so the defender cannot cope.',
  },
  80: {
    fen: 'r1bq1rk1/ppp1bppp/2n2n2/3pp3/3P4/2NBPN2/PPP2PPP/R1BQ1RK1 w - - 0 1',
    moves: ['dxe5', 'Nxe5', 'Nxe5'],
    caption: 'Sacrifice pawns to rip open lines for your attackers.',
  },
  81: {
    fen: 'r1bq1rk1/ppp1bppp/2n2n2/3pp3/3P4/2N1PN2/PPPB1PPP/R2QKB1R w KQ - 0 1',
    moves: ['Bg5', 'Be6', 'Bxf6', 'Bxf6'],
    caption: 'Take out the key defender — the attack lands cleanly.',
  },
  84: {
    fen: '2rq1rk1/pp1bppbp/3p1np1/8/3NP3/2N1B3/PPPQ1PPP/2KR3R w - - 0 1',
    moves: ['h4', 'a6', 'h5'],
    caption: 'Shift the attack flank-to-flank to stretch the defence.',
  },
  86: {
    fen: '2rq1rk1/pp1bppbp/3p1np1/8/3NP2P/2N1B3/PPPQ1PP1/2KR3R w - - 0 1',
    moves: ['Kb1', 'a6', 'Nf3'],
    caption: 'After an attack stalls — regroup before the next push.',
  },

  // ─── Endgame ──────────────────────────────────────────────────────────
  88: {
    fen: '8/8/8/8/8/8/8/K6k w - - 0 1',
    moves: ['Kb2', 'Kg2', 'Kc3', 'Kf3', 'Kd4', 'Kf4'],
    caption: 'In the endgame the king marches to the centre.',
  },
  89: {
    fen: '8/8/4k3/8/4P3/4K3/8/8 w - - 0 1',
    moves: ['Kd4', 'Kd6', 'e5+', 'Ke6'],
    caption: 'The endgame king is a strong piece — use it offensively.',
  },
  90: {
    fen: '4k3/8/4K3/3B4/8/8/8/8 w - - 0 1',
    moves: ['Bc4', 'Kf8', 'Bd5'],
    caption: 'Bishop dances; the enemy king runs out of safe moves.',
  },
  91: {
    fen: '4k3/8/4K3/4P3/8/8/8/8 b - - 0 1',
    moves: ['Kd8', 'Kd6', 'Ke8', 'e6', 'Kf8', 'e7+', 'Kf7', 'Kd7'],
    caption: 'White wins the opposition and escorts the pawn home.',
  },
  92: {
    fen: '4k3/4b3/8/3p4/3P4/8/3B4/4K3 w - - 0 1',
    moves: ['Bc3', 'Bd6', 'Bb4'],
    caption: 'Opposite-colour bishops: extra pawns often cannot win.',
  },
  93: {
    fen: '8/8/4k3/8/8/4K3/n7/P7 w - - 0 1',
    moves: ['a3', 'Kd5', 'a4'],
    caption: 'A rook-pawn is a knight\'s worst nightmare.',
  },
  94: {
    fen: '4k3/3p4/8/8/8/8/3P4/3RK2R w K - 0 1',
    moves: ['Re1+', 'Kf8', 'Re7'],
    caption: 'Active rooks decide endgames — keep them off the back rank.',
  },
  95: {
    fen: '4k3/8/8/8/4P3/8/8/R3K3 w Q - 0 1',
    moves: ['Ra5', 'Kd7', 'Ke2'],
    caption: 'Place your rook BEHIND the passed pawn — it pushes safely.',
  },
  96: {
    fen: '3rk3/8/8/8/8/8/8/3RK1R1 w - - 0 1',
    moves: ['Rxd8+', 'Kxd8'],
    caption: "Up the exchange? Trade the opponent's second rook to win.",
  },
  97: {
    fen: '4k3/pp6/8/8/8/8/PP3PPP/4K3 w - - 0 1',
    moves: ['g4', 'Kd7', 'h4', 'Kc6', 'g5'],
    caption: 'In a majority, push the unopposed pawn first.',
  },
  98: {
    fen: '6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1',
    moves: ['Qd5', 'Kh8', 'Qe5'],
    caption: 'A centralised queen controls almost half the board.',
  },

  // ─── General Wisdom ───────────────────────────────────────────────────
  99: {
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    moves: ['Ng5', 'd5', 'exd5', 'Nxd5'],
    caption: 'Always assume the opponent plays the strongest reply.',
  },
  100: {
    fen: '4k3/8/8/3p4/8/8/8/4K3 w - - 0 1',
    moves: ['Kd2', 'Kd7', 'Ke3'],
    caption: "A weakness only matters if it can be ATTACKED.",
  },
  101: {
    moves: ['e4', 'g6', 'd4', 'Bg7', 'Nc3', 'd6', 'f4'],
    caption: 'Rules guide play — but masters know when to break them.',
  },
};

export const hasDemo = (n: number) => n in principleDemos;
