import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Rocket,
  Layers,
  Wheat,
  ArrowLeftRight,
  Castle,
  Swords,
  ShieldCheck,
  Flame,
  Crown,
  Lightbulb,
  Search,
} from 'lucide-react';

type Principle = { n: number; title: string; body: string };

type Category = {
  id: string;
  name: string;
  icon: any;
  color: string;
  description: string;
  principles: Principle[];
};

const categories: Category[] = [
  {
    id: 'opening',
    name: 'Opening Play',
    icon: Rocket,
    color: 'text-blue-500',
    description: 'Develop pieces, control the center, and get your king to safety.',
    principles: [
      { n: 1, title: 'Rapidly develop all pieces', body: 'The main goal at opening is to develop pieces and reach castling as quick as possible. Opening is complete when one or both players have their Rooks connected. The player who finishes development first gains the initiative.' },
      { n: 2, title: 'Develop Knights before Bishops', body: "Bishops can control several squares from their original position if there are no pawns obstructing their way. Knights dominate only their neighbour squares and take longer to reach the opponent's field, because they are less mobile pieces." },
      { n: 3, title: "Don't move the same piece twice during opening", body: 'Try to place your pieces at the best possible position on the first move. It is a waste of time to move the same piece more than once during the opening and it may cost you the initiative.' },
      { n: 4, title: "Don't make unnecessary pawn moves during opening", body: 'Pawn moves should be restricted during the opening, because the time could be applied to develop another piece. Moving pawns is suitable when opening diagonals for the Queen or Bishops, or occupying the center.' },
      { n: 5, title: "Don't check if not necessary", body: 'A check that can easily be defended by the opponent is unnecessary. Most checks during the opening can be defended by moves that favor development.' },
      { n: 6, title: "Don't open a position if you are late in development", body: 'An open position favors the color with more pieces in the game. Only the player with an advantage in development should produce an open position.' },
      { n: 7, title: 'Place the Queen behind the line of friendly pawns', body: "Since the Queen is very powerful, she is also very vulnerable to constant attacks. Place her behind a pawn, preferably on the second rank so that the first rank is free for Rook development." },
      { n: 8, title: 'Avoid trading a developed piece for an undeveloped one', body: "Trading a well-positioned piece for a bad-positioned one wastes time. Same goes for trading a piece that has moved a lot for one that your opponent moved only once." },
      { n: 9, title: 'Castle as quickly as possible', body: "King safety is one of the most important things during opening and middlegame. The King in the center is very vulnerable, especially in open positions. Castling places your King safely behind pawns and develops a Rook." },
      { n: 10, title: 'Kingside castling is safer than Queenside', body: 'Kingside castling places the King further from the center, behind protected pawns, and is quicker (only 2 pieces to move). Queenside castling on the opposite wing can create attacking opportunities.' },
      { n: 11, title: 'Try to prevent the opponent from castling', body: "If your opponent waits too long to castle, keep their King in the center. Control passage squares (f1/f8 for kingside) — even sacrificing a pawn can be worthwhile." },
      { n: 12, title: 'Dominate as much territory as possible', body: 'Greater space means greater mobility and flexibility for your pieces. A restricted opponent struggles to maneuver, which can be fatal when defending the King.' },
    ],
  },
  {
    id: 'center',
    name: 'Center & Space',
    icon: Layers,
    color: 'text-purple-500',
    description: 'Use pawns and pieces to dominate the central squares.',
    principles: [
      { n: 13, title: 'Advance pawns to conquer space', body: 'Pawn advances restrict the opponent, but the further pawns go, the harder they are to defend. Each advance also creates weaknesses on adjacent squares.' },
      { n: 14, title: 'As pawns advance they get harder to protect', body: 'A weak pawn must be defended by pieces, which lose effectiveness in a defensive role while enemy pieces stay active.' },
      { n: 15, title: 'Place your pawns in the center', body: 'The center is e4, e5, d4, d5. The expanded center includes c3, c6, f3, f6. Pawns are the best units to build the center because they cannot be attacked by enemy pawns from the side.' },
      { n: 16, title: 'Keep pieces close to the center', body: 'In the center, pieces control more squares. A Knight controls 8 squares from the center but only 2 from a corner. Central control lets pieces shift between flanks quickly.' },
      { n: 17, title: 'When trading pawns, capture toward the center', body: 'If two pawns can recapture, choose the one that ends closer to the center — central pawns are more important than lateral ones.' },
      { n: 18, title: 'Control the center before attacking', body: 'Successful wing attacks depend on central control. Secure a strong, stable center before launching a flank attack.' },
    ],
  },
  {
    id: 'pawns',
    name: 'Pawn Structure',
    icon: Wheat,
    color: 'text-amber-500',
    description: 'Pawns are the foundation of strategy. Avoid weaknesses, exploit theirs.',
    principles: [
      { n: 19, title: 'Pawns are the foundation of strategy', body: 'Pawn structure is fundamental to any position. Avoid isolated, doubled, backward, and hanging pawns.' },
      { n: 20, title: 'Pawn weakness is eternal', body: 'Pieces can move to become active, but pawn-structure deficiencies are long-term. Take your time exploiting them.' },
      { n: 21, title: 'Avoid doubled pawns', body: 'Two pawns of the same color on the same file have less mobility and are vulnerable to attack — especially when isolated. Compensation may come from open files or central control.' },
      { n: 22, title: 'Avoid isolated pawns', body: 'Isolated pawns have no friendly pawn on adjacent files, so they must be defended by pieces. The square directly in front (a hole) is easily occupied by enemy pieces.' },
      { n: 23, title: 'Avoid backward pawns', body: 'A backward pawn lags behind its neighbours and cannot advance safely. The square in front is a hole that the opponent will occupy.' },
      { n: 24, title: 'Avoid creating holes (weak squares)', body: 'Every pawn advance creates holes on adjacent squares — squares that cannot be defended by pawns and that enemy pieces can occupy permanently.' },
      { n: 25, title: 'Avoid pawn islands', body: 'A pawn group separated from others is an island. More islands means more bases to defend. At the endgame, fewer islands is a real advantage.' },
      { n: 26, title: 'Think carefully before advancing hanging pawns', body: 'Hanging pawns control many squares but cannot be defended by other pawns. Advancing one creates a backward pawn and a hole.' },
      { n: 27, title: "Put pressure on the opponent's backward pawn", body: "Force your opponent to spend resources defending it, then attack elsewhere." },
      { n: 28, title: 'Force your opponent to advance hanging pawns', body: 'Pressure them until one advances — creating a hole you can occupy.' },
      { n: 29, title: 'Whenever possible, create a passed pawn', body: 'A passed pawn has no enemy pawns ahead in its file or on adjacent files. It is a dangerous weapon because it can reach the last rank and promote.' },
      { n: 30, title: "Always blockade your opponent's passed pawns", body: 'Stop a passed pawn fast by placing a piece directly in front of it. Knights and Bishops are the best blockaders.' },
      { n: 31, title: 'The Knight is the best blockader', body: "The Knight's jumping ability means its range isn't impaired by the pawn it blocks. The Bishop is second best, especially when adjacent diagonals are open." },
      { n: 32, title: 'Pawn majority distant from the enemy King is an advantage', body: 'A pawn majority on one wing generally creates a passed pawn when correctly advanced — especially powerful when far from the enemy King.' },
      { n: 33, title: 'Minority attack', body: 'When the opponent has a pawn majority on one side, you can advance fewer pawns to force trades, leaving them with an isolated or backward pawn.' },
    ],
  },
  {
    id: 'trades',
    name: 'Trades & Piece Value',
    icon: ArrowLeftRight,
    color: 'text-cyan-500',
    description: 'Know when (and when not) to exchange pieces.',
    principles: [
      { n: 34, title: 'Avoid unnecessary trades', body: "Trade only when: opponent has the initiative; you're restricted; to weaken pawn structure; you're up material; to swap a passive piece for an active one; to simplify into a winning endgame; or to remove a key defender." },
      { n: 35, title: 'Piece value varies with position', body: 'A well-positioned piece is far more valuable than a poorly placed equivalent. Good pieces are protected, mobile, hard to attack, cooperate with others, and create threats.' },
      { n: 82, title: 'Avoid trading while attacking', body: 'Unless there is a very good reason, do not trade pieces while attacking — especially the Queens. Trades usually ease the defender.' },
      { n: 83, title: 'Plan hypothetical trades', body: 'Mentally remove pieces from the board to evaluate the resulting position before committing to an exchange.' },
      { n: 85, title: 'With material advantage, simplify', body: 'Material edges grow as pieces leave the board. One extra unit in a 4-vs-3 battle is far more decisive than in a 10-vs-9 battle.' },
      { n: 87, title: 'Up a pawn? Trade pieces, not pawns', body: 'Fewer pieces means a simpler position and an easier conversion of the extra pawn.' },
    ],
  },
  {
    id: 'pieces',
    name: 'Pieces (Knights, Bishops, Rooks)',
    icon: Castle,
    color: 'text-green-500',
    description: 'How to handle each piece for maximum effect.',
    principles: [
      { n: 36, title: 'Place Rooks on the 7th or 8th rank', body: 'A Rook on the 7th rank attacks pawns, restricts the King, and creates mate threats.' },
      { n: 37, title: 'Double Rooks on the 7th rank', body: 'Two Rooks on the 7th condemn the opponent to passivity and often win.' },
      { n: 38, title: 'Not every pawn should promote to a Queen', body: 'Auto-queening causes stalemates. Pick the right piece for the position.' },
      { n: 39, title: 'Keep your Knights close to the center', body: 'Knights need centralization most — 8 squares from the center vs 4 from the edge, and only 2 moves to cross the board.' },
      { n: 40, title: 'Rooks should occupy open or half-open files', body: 'Rooks are developed last. Ideal squares: e1/d1/c1 (e8/d8/c8 for Black) — pressuring the center while defending the back rank.' },
      { n: 41, title: 'Keep your Bishops active', body: "A Bishop unblocked by its own pawns is a good Bishop. A Bishop restricted by its pawns is a bad Bishop." },
      { n: 42, title: "Pawns on the color of your opponent's Bishop", body: "If the opponent has only one Bishop, place your pawns on squares of its color. If you have only one Bishop, do the opposite." },
      { n: 43, title: 'A Bishop is worth more than a Knight in open positions', body: 'Open diagonals make Bishops shine — they can attack one side and defend the other simultaneously. Knights are restricted to one area.' },
      { n: 44, title: 'A Knight is worth more than a Bishop in closed positions', body: 'In rigid pawn chains, Knights jump over barriers Bishops cannot cross.' },
      { n: 45, title: 'Knights need outposts', body: 'An outpost is a square (often on the 5th/6th rank) defended by a pawn and immune to enemy pawn attacks. A Knight there pressures the whole position.' },
      { n: 46, title: 'In mobile pawn endgames, the Bishop is usually stronger', body: 'The Bishop side keeps pawns mobile; the Knight side tries to fix them on the wrong color.' },
      { n: 47, title: 'Two Bishops beat Bishop+Knight or two Knights', body: 'Bishops complement each other (one per color) and form a powerful long-range pair. You can always trade one off if needed.' },
      { n: 48, title: 'Fighting Bishop + Knight with two Bishops', body: "Restrict the enemy Bishop with pawns on its color; deny the Knight outposts and central squares." },
      { n: 49, title: 'Fighting a pair of Bishops', body: 'Block their diagonals with pawn chains and conquer outposts for your Knights.' },
      { n: 50, title: 'Pawns on opposite color of your Bishop', body: "If you have only one Bishop, place pawns on the opposite color. The Bishop covers one color, the pawns the other — perfect harmony." },
      { n: 51, title: 'Bishops belong in front of the pawn chain', body: 'A Bishop blocked behind its own pawns is severely weakened. Place it in front when pawns sit on its color.' },
      { n: 52, title: "If opponent has two Bishops, trade one off", body: 'Removing one Bishop strips them of dominance over that color complex.' },
      { n: 53, title: "Watch the squares of the opponent's other Bishop", body: "If you traded a Bishop, you can't easily defend squares of the missing color. Be vigilant." },
      { n: 54, title: 'A Bishop can dominate a Knight', body: 'A Knight on the edge of the board can be totally controlled by a Bishop — in endgames this is often decisive.' },
    ],
  },
  {
    id: 'defense',
    name: 'Defense',
    icon: ShieldCheck,
    color: 'text-sky-500',
    description: 'Think defense first. Anticipate threats and stay solid.',
    principles: [
      { n: 55, title: 'Think about defense first', body: "After each opponent move, ask: Where does this threaten me? What are their intentions? What would I do in their place?" },
      { n: 56, title: "Assess changes after every opponent move", body: 'What does it attack/defend? Where has defense been withdrawn? Which lines opened or closed? Where can the piece head next?' },
      { n: 57, title: 'Keep the back rank protected', body: "Open a luft for your King before withdrawing Rooks from the 8th rank, or risk back-rank mates." },
      { n: 58, title: "Don't let your pieces get overloaded", body: 'An overloaded piece defends two things at once — forcing it to move loses something.' },
      { n: 59, title: "Don't recapture automatically", body: 'Always consider intermediate moves (zwischenzugs) before retaking.' },
      { n: 60, title: 'Avoid advancing pawns in front of your King', body: 'Every such move creates a weakness that may seem minor but can be decisive later.' },
      { n: 61, title: 'Never allow your King to be in check unexpectedly', body: 'Surprise checks are the key to many tactics.' },
      { n: 62, title: "Don't place heavy pieces in the range of lower ones", body: 'A more valuable piece in the line of a less valuable one is effectively neutralized.' },
      { n: 63, title: "Cramped? Trade a piece or two", body: 'Trades free up space when restricted. With more space, avoid trades and shift attack between flanks.' },
      { n: 64, title: "Eliminate the opponent's best piece", body: 'If a single enemy piece is dominating, trade it off.' },
      { n: 65, title: 'Keep your pieces protected', body: "Unprotected pieces invite combinations. Defend them with pawns when possible — piece defenders abandon their job when attacked themselves." },
      { n: 66, title: "Keep pieces off the opponent's Bishop's color", body: "If the opponent has only one Bishop, place your pieces on the opposite color." },
      { n: 67, title: 'Get rid of pinned pieces', body: "A pinned piece is paralyzed and vulnerable — once attacked by a pawn, material loss is unavoidable." },
      { n: 68, title: "Never make the job easy for your opponent", body: "Even in a worse position, place obstacles, prolong defense, induce mistakes." },
      { n: 69, title: 'Answer a wing attack with a central counter', body: 'A counterattack in the center is often the best response to a flank attack — even at the cost of a pawn.' },
      { n: 70, title: "Anticipate your opponent's threats", body: 'Direct threats are easy to meet; remote threats must be seen many moves in advance.' },
      { n: 71, title: "Trade off the opponent's fianchettoed Bishop", body: 'Removing it weakens the squares around their King and opens lines for attack.' },
    ],
  },
  {
    id: 'attack',
    name: 'Attack & Initiative',
    icon: Flame,
    color: 'text-red-500',
    description: 'Build advantages, then strike where the opponent is weakest.',
    principles: [
      { n: 72, title: "Improve your pieces' position", body: 'Gradually maneuver pieces to better squares — more control, better cooperation, more pressure.' },
      { n: 73, title: 'Restrict the movement of enemy pieces', body: 'Keep enemy pieces away from the area of action whenever you can.' },
      { n: 74, title: 'Confine an enemy piece', body: 'Sidelining a single enemy piece can be enough for a decisive advantage.' },
      { n: 75, title: 'Always create a threat', body: 'Threats force the opponent to spend resources defending — disrupting their plans.' },
      { n: 76, title: 'Create new weaknesses in the enemy camp', body: "Don't be satisfied attacking existing weaknesses — manufacture new ones, often via pawn moves." },
      { n: 77, title: "Concentrate on your opponent's weak points", body: 'As they bring defenders to one spot, other areas become exposed for a second attack.' },
      { n: 78, title: 'Accumulate advantages before attacking', body: 'Make weaknesses and develop your pieces aggressively first. Premature attacks let the defender consolidate.' },
      { n: 79, title: 'Concentrate forces when you attack', body: 'Mass enough firepower at the target so the defender cannot respond effectively.' },
      { n: 80, title: 'Open ranks, files, and diagonals', body: 'Use pawn moves and sacrifices to open lines so your attacking pieces can enter the enemy position.' },
      { n: 81, title: "Eliminate key defenders", body: "Identify the most important defensive piece and trade it off or chase it away." },
      { n: 84, title: 'Shift the attack between flanks', body: 'Often two weaknesses are needed to win. Alternating attacks overload the defender — especially when they are cramped.' },
      { n: 86, title: 'Reorganize your pieces after an attack', body: "After an attack pieces lose harmony. Regroup and shore up weak points before launching the next blow." },
    ],
  },
  {
    id: 'endgame',
    name: 'Endgame',
    icon: Crown,
    color: 'text-yellow-500',
    description: 'Activate the King, push passed pawns, and convert your edge.',
    principles: [
      { n: 88, title: 'Centralize the King in the endgame', body: 'Once Queens leave the board, the King is a fighting piece. Bring it toward the center early so it can reach any flank quickly.' },
      { n: 89, title: 'The King must be active in the endgame', body: 'The King should pursue and blockade enemy pawns — mate threats are minimal here.' },
      { n: 90, title: 'Drag your opponent into Zugzwang', body: 'Zugzwang: any move worsens the position. Particularly potent in Bishop vs Knight endings where the Bishop keeps control while moving.' },
      { n: 91, title: 'Many wins are based on winning the opposition', body: 'Two Kings on the same line with one square between them are in opposition. The side not to move (in zugzwang) must give way.' },
      { n: 92, title: 'Opposite-colored Bishop endings tend to draw', body: 'Each Bishop controls squares the other cannot touch, so attacks are easy to defuse — even with extra pawns.' },
      { n: 93, title: 'Flank (Rook) pawns are very strong against Knights', body: 'Knights are slow on the edges of the board, so corner-bound passed pawns are nightmares for them.' },
      { n: 94, title: 'Keep your Rooks active in endgames', body: "An active Rook is far stronger than a passive one and is often enough to win." },
      { n: 95, title: 'Always place a Rook behind a passed pawn', body: 'Rooks belong behind passed pawns — supporting your own or attacking the opponent\'s.' },
      { n: 96, title: 'Down the exchange? Keep the second Rook', body: "If you're up the exchange, trading the opponent's second Rook usually wins — a lone minor piece can't fight a Rook." },
      { n: 97, title: 'Create a passed pawn from a majority', body: 'Advance first the pawn with no opponent in its file. If the opponent blocks your most advanced pawn, the majority loses its punch.' },
      { n: 98, title: 'Centralize the Queen in endgames', body: 'Once trades happen, centralize the Queen — almost half the board is under her control and the enemy Queen is denied key squares.' },
    ],
  },
  {
    id: 'wisdom',
    name: 'General Wisdom',
    icon: Lightbulb,
    color: 'text-pink-500',
    description: 'Universal advice that ties everything together.',
    principles: [
      { n: 99, title: "Always expect your opponent's best move", body: "Don't hope for blunders. Play moves that improve your position even against perfect defense." },
      { n: 100, title: 'Not every weakness is bad', body: "Weaknesses matter only if the opponent can exploit them. A weak pawn that can't be reached, or a weak square that can't be occupied, is harmless." },
      { n: 101, title: 'Every rule was made to be broken', body: "Chess is not exact. Knowing when to violate a principle is what separates a Grandmaster from an amateur. Still: avoid advancing pawns in front of your King unless you have a very good reason." },
    ],
  },
];

export const ChessPrinciples = () => {
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return categories;
    return categories
      .map((c) => ({
        ...c,
        principles: c.principles.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.body.toLowerCase().includes(q) ||
            String(p.n) === q,
        ),
      }))
      .filter((c) => c.principles.length > 0);
  }, [q]);

  const total = categories.reduce((s, c) => s + c.principles.length, 0);

  return (
    <div className="space-y-6">
      <Card className="gradient-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Swords className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl">101 Chess Principles</CardTitle>
          </div>
          <CardDescription className="text-base">
            Timeless guidelines for opening, middlegame and endgame play — organized by theme.
            Tap any principle to read the full explanation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search principles (e.g. castling, passed pawn, knight)..."
                className="pl-9"
              />
            </div>
            <Badge variant="secondary" className="self-start sm:self-auto">
              {q ? `${filtered.reduce((s, c) => s + c.principles.length, 0)} match${filtered.reduce((s, c) => s + c.principles.length, 0) === 1 ? '' : 'es'}` : `${total} principles`}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="gradient-card p-8 text-center text-muted-foreground">
          No principles match your search.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((cat) => {
            const Icon = cat.icon;
            return (
              <Card key={cat.id} className="gradient-card">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-lg bg-background/50 ${cat.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-xl">{cat.name}</CardTitle>
                        <Badge variant="outline">{cat.principles.length}</Badge>
                      </div>
                      <CardDescription className="mt-1">{cat.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {cat.principles.map((p) => (
                      <AccordionItem key={p.n} value={`p-${p.n}`}>
                        <AccordionTrigger className="text-left hover:no-underline">
                          <span className="flex items-start gap-3 pr-2">
                            <span className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                              #{p.n}
                            </span>
                            <span className="font-medium">{p.title}</span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed pl-11">
                          {p.body}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChessPrinciples;
