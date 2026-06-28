import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Trophy, BookOpen, Target, Brain, Crown, Swords, Flame,
  PlayCircle, ExternalLink, GraduationCap, Search, Zap, Shield, Rocket,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type Level = {
  id: string;
  title: string;
  rating: string;
  icon: any;
  color: string;
  tagline: string;
  goals: string[];
  modules: { title: string; description: string; path?: string; external?: string }[];
  resources: { label: string; url: string; type: "video" | "article" | "tool" | "book" }[];
};

const LEVELS: Level[] = [
  {
    id: "beginner",
    title: "Beginner",
    rating: "Unrated → 800",
    icon: GraduationCap,
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-500",
    tagline: "Learn the rules, piece movement, and the goal of the game.",
    goals: [
      "Know how every piece moves and captures",
      "Understand check, checkmate, stalemate, en passant, castling, promotion",
      "Avoid hanging pieces — always check what your opponent threatens",
      "Play full games to completion without resigning early",
    ],
    modules: [
      { title: "Chess Basics", description: "Board, notation, all piece movements", path: "/training" },
      { title: "101 Principles", description: "Foundational chess wisdom with animated demos", path: "/training" },
      { title: "Easy Puzzles", description: "Mate-in-1 and basic captures", path: "/puzzles" },
    ],
    resources: [
      { label: "ChessKid — Learn the Rules", url: "https://www.chesskid.com/learn-chess", type: "tool" },
      { label: "How to Play Chess (Chess.com)", url: "https://www.chess.com/learn-how-to-play-chess", type: "article" },
      { label: "Chess for Beginners — GothamChess", url: "https://www.youtube.com/watch?v=OCSbzArwB10", type: "video" },
    ],
  },
  {
    id: "novice",
    title: "Novice",
    rating: "800 → 1200",
    icon: BookOpen,
    color: "from-blue-500/20 to-cyan-500/20 text-blue-500",
    tagline: "Build opening habits, spot basic tactics, finish won endgames.",
    goals: [
      "Develop knights before bishops, castle early, connect rooks",
      "Recognize forks, pins, skewers, discovered attacks",
      "Convert King + Queen vs King and King + Rook vs King",
      "Stop blundering pieces in 1 move",
    ],
    modules: [
      { title: "Opening Theory", description: "Italian, Spanish, London, Caro-Kann", path: "/openings" },
      { title: "Tactical Puzzles", description: "Forks, pins, skewers — rated", path: "/puzzles" },
      { title: "Endgame Basics", description: "Essential mating patterns", path: "/endgames" },
    ],
    resources: [
      { label: "Building Habits — Aman Hambleton", url: "https://www.youtube.com/playlist?list=PLBRObSmbZluTx0-Pgwz0PrJWTI5Tsa9E1", type: "video" },
      { label: "Lichess Practice", url: "https://lichess.org/practice", type: "tool" },
      { label: "Logical Chess: Move by Move (Chernev)", url: "https://www.amazon.com/Logical-Chess-Move-Every-Explained/dp/0713484640", type: "book" },
    ],
  },
  {
    id: "intermediate",
    title: "Intermediate",
    rating: "1200 → 1600",
    icon: Target,
    color: "from-purple-500/20 to-pink-500/20 text-purple-500",
    tagline: "Calculate variations, build plans, learn pawn structures.",
    goals: [
      "Calculate 2-3 moves ahead reliably",
      "Understand isolated, doubled, passed pawns",
      "Have a real opening repertoire as White and Black",
      "Win rook endgames a pawn up",
    ],
    modules: [
      { title: "Personalized Lessons", description: "AI-tailored to your weaknesses", path: "/lessons" },
      { title: "Game Analysis", description: "Review your games move-by-move", path: "/analytics" },
      { title: "Smart Chess Mentor", description: "Ask the AI about positions", path: "/training" },
    ],
    resources: [
      { label: "Hanging Pawns — Pawn Structures", url: "https://www.youtube.com/c/HangingPawns", type: "video" },
      { label: "ChessTempo Tactics", url: "https://chesstempo.com/", type: "tool" },
      { label: "My System (Nimzowitsch)", url: "https://www.amazon.com/My-System-Aron-Nimzowitsch/dp/4871875873", type: "book" },
    ],
  },
  {
    id: "advanced",
    title: "Advanced",
    rating: "1600 → 2000",
    icon: Swords,
    color: "from-orange-500/20 to-amber-500/20 text-orange-500",
    tagline: "Deep strategy, prophylaxis, complex endgames, opening prep.",
    goals: [
      "Play prophylactically — anticipate opponent ideas",
      "Master Lucena, Philidor, opposite-color bishop endings",
      "Prepare lines 10+ moves deep with engine review",
      "Manage clock pressure in critical positions",
    ],
    modules: [
      { title: "Deep Endgame Training", description: "Theoretical positions", path: "/endgames" },
      { title: "Tournament Play", description: "Compete with rated players", path: "/tournaments" },
      { title: "Highlights", description: "Create clips of your best moves", path: "/highlights" },
    ],
    resources: [
      { label: "Daniel Naroditsky Speedruns", url: "https://www.youtube.com/@DanielNaroditskyGM", type: "video" },
      { label: "Lichess Studies", url: "https://lichess.org/study", type: "tool" },
      { label: "Dvoretsky's Endgame Manual", url: "https://www.amazon.com/Dvoretskys-Endgame-Manual-Mark-Dvoretsky/dp/1949859193", type: "book" },
    ],
  },
  {
    id: "expert",
    title: "Expert / Master",
    rating: "2000 → 2400",
    icon: Crown,
    color: "from-rose-500/20 to-red-500/20 text-rose-500",
    tagline: "Tournament-grade prep, novelties, and grinding technique.",
    goals: [
      "Maintain a rigorous opening database (ChessBase / Lichess studies)",
      "Calculate 6+ moves deep in forcing lines",
      "Convert microscopic advantages into wins",
      "Stay objective in time scrambles",
    ],
    modules: [
      { title: "AI Coach Analysis", description: "Engine-level move explanations", path: "/training" },
      { title: "Full Game Review", description: "Multi-engine annotation", path: "/analytics" },
    ],
    resources: [
      { label: "ChessBase / Mega Database", url: "https://shop.chessbase.com/", type: "tool" },
      { label: "Lichess Opening Explorer", url: "https://lichess.org/analysis", type: "tool" },
      { label: "Yusupov's Build Up Your Chess (Series)", url: "https://www.qualitychess.co.uk/products/1/26/build_up_your_chess_1_by_artur_yusupov/", type: "book" },
    ],
  },
  {
    id: "gm",
    title: "Grandmaster Path",
    rating: "2400+",
    icon: Trophy,
    color: "from-yellow-500/20 to-amber-500/20 text-yellow-500",
    tagline: "Norm chasing, world-class prep, psychological mastery.",
    goals: [
      "Earn 3 GM norms with 2600+ TPR",
      "Maintain physical fitness for 6-hour games",
      "Use Stockfish + Leela for novelty hunting",
      "Build a second / coaching team",
    ],
    modules: [
      { title: "Tournament Hub", description: "Find invite-only events", path: "/tournaments" },
      { title: "AI Chess Mentor", description: "Engine-grade analysis", path: "/training" },
    ],
    resources: [
      { label: "FIDE Title Regulations", url: "https://handbook.fide.com/chapter/B01Regulations2022", type: "article" },
      { label: "ChessBase Magazine", url: "https://en.chessbase.com/", type: "article" },
      { label: "Magnus Carlsen Masterclass", url: "https://www.masterclass.com/classes/garry-kasparov-teaches-chess", type: "video" },
    ],
  },
];

const RESOURCE_ICON: Record<string, any> = {
  video: PlayCircle,
  article: BookOpen,
  tool: Zap,
  book: BookOpen,
};

export function LearningPath() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("beginner");

  const filtered = LEVELS.filter(l =>
    !query || (l.title + l.tagline + l.goals.join(" ") + l.resources.map(r => r.label).join(" "))
      .toLowerCase().includes(query.toLowerCase())
  );

  const activeLevel = LEVELS.find(l => l.id === active) ?? LEVELS[0];
  const activeIdx = LEVELS.findIndex(l => l.id === active);
  const progress = ((activeIdx + 1) / LEVELS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="gradient-card overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <CardHeader className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="w-6 h-6 text-primary" />
            <Badge variant="outline" className="text-xs">Beginner → Grandmaster</Badge>
          </div>
          <CardTitle className="text-3xl">Your Chess Learning Roadmap</CardTitle>
          <CardDescription className="text-base max-w-2xl">
            A structured journey with curated lessons, videos, books, tools, and Chessafari AI guidance at every stage.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current focus: <strong className="text-foreground">{activeLevel.title}</strong></span>
            <span className="text-muted-foreground">{activeIdx + 1} / {LEVELS.length}</span>
          </div>
          <Progress value={progress} />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search levels, goals, resources..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Level selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {LEVELS.map((l, i) => {
          const Icon = l.icon;
          const isActive = active === l.id;
          return (
            <button
              key={l.id}
              onClick={() => setActive(l.id)}
              className={`group relative p-4 rounded-xl border text-left transition-all ${
                isActive
                  ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                  : "border-border hover:border-primary/50 bg-card"
              }`}
            >
              <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${l.color} mb-2`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-xs text-muted-foreground">Stage {i + 1}</div>
              <div className="font-semibold text-sm">{l.title}</div>
              <div className="text-[11px] text-muted-foreground">{l.rating}</div>
            </button>
          );
        })}
      </div>

      {/* Active level detail */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No matches for "{query}"</Card>
      ) : (
        <Card className="gradient-card">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${activeLevel.color}`}>
                <activeLevel.icon className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-2xl">{activeLevel.title}</CardTitle>
                  <Badge>{activeLevel.rating}</Badge>
                </div>
                <CardDescription className="mt-1 text-base">{activeLevel.tagline}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Goals */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Goals at this stage
              </h4>
              <div className="grid sm:grid-cols-2 gap-2">
                {activeLevel.goals.map((g, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
                    <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm">{g}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modules */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" /> Train inside Chessafari
              </h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeLevel.modules.map((m, i) => (
                  <Card key={i} className="hover:border-primary/50 transition-all">
                    <CardContent className="p-4 space-y-2">
                      <div className="font-semibold text-sm">{m.title}</div>
                      <div className="text-xs text-muted-foreground">{m.description}</div>
                      {m.path && (
                        <Button size="sm" variant="secondary" className="w-full mt-2" onClick={() => navigate(m.path!)}>
                          Open
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* External resources */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" /> Curated external resources
              </h4>
              <div className="space-y-2">
                {activeLevel.resources.map((r, i) => {
                  const Icon = RESOURCE_ICON[r.type];
                  return (
                    <a
                      key={i}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 hover:border-primary/40 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{r.label}</div>
                          <div className="text-xs text-muted-foreground capitalize">{r.type}</div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Ask AI CTA */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
              <CardContent className="p-5 flex items-center gap-4 flex-wrap">
                <div className="p-3 rounded-full bg-primary/20">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold">Stuck? Ask Chessafari AI</div>
                  <div className="text-xs text-muted-foreground">
                    Get instant explanations tailored to your {activeLevel.title.toLowerCase()} level.
                  </div>
                </div>
                <Button
                  onClick={() => window.dispatchEvent(new CustomEvent("open-chessafari-ai", {
                    detail: { prompt: `I'm at the ${activeLevel.title} stage (${activeLevel.rating}). What should I focus on next?` }
                  }))}
                >
                  Ask AI
                </Button>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
