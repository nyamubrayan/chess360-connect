import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Target } from 'lucide-react';
import { CommunityBar } from '@/components/CommunityBar';
import { EndgameLesson } from '@/components/endgames/EndgameLesson';

interface EndgameScenario {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  startingFen: string;
  solutionMoves: string[];
  keyIdeas: string[];
}

const endgameScenarios: EndgameScenario[] = [
  {
    id: 'king-pawn-king',
    name: 'King and Pawn vs King',
    description: 'Learn the fundamental technique of promoting a pawn with king support',
    difficulty: 'beginner',
    startingFen: '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1',
    solutionMoves: ['e2e4', 'e5d6', 'e4e5', 'd6d7', 'e5e6', 'd7d8', 'e6e7', 'd8c7', 'e7e8q'],
    keyIdeas: [
      'Push the pawn with king support',
      'Opposition is key to winning',
      'Use the king to shield the pawn',
      'Promote to a queen for the win'
    ]
  },
  {
    id: 'rook-pawn',
    name: 'Rook vs Pawn (Philidor Position)',
    description: 'Master the defensive technique to hold a draw with rook against pawn',
    difficulty: 'intermediate',
    startingFen: '8/8/3k4/3p4/8/3K4/3R4/8 w - - 0 1',
    solutionMoves: ['d2d1', 'd6e6', 'd1e1', 'e6f5', 'e1f1', 'f5e5', 'f1e1', 'e5d4', 'e1d1'],
    keyIdeas: [
      'Place rook on the first rank',
      'Give checks from behind when pawn advances',
      'Keep the king cut off',
      'Draw by perpetual check'
    ]
  },
  {
    id: 'lucena-position',
    name: 'Lucena Position',
    description: 'The essential winning technique for rook and pawn endgames',
    difficulty: 'intermediate',
    startingFen: '1K6/1P1k4/8/8/8/8/r7/1R6 w - - 0 1',
    solutionMoves: ['b1f1', 'a2a4', 'f1f4', 'a4a1', 'b8c7', 'a1c1', 'c7d6'],
    keyIdeas: [
      'Build a bridge with the rook',
      'Block enemy checks with your rook',
      'King moves up to support the pawn',
      'Pawn promotes with rook shield'
    ]
  },
  {
    id: 'queen-vs-rook',
    name: 'Queen vs Rook',
    description: 'Learn how to win with a queen against a lone rook',
    difficulty: 'advanced',
    startingFen: '7k/8/7K/8/8/8/Q7/6r1 w - - 0 1',
    solutionMoves: ['a2a8', 'h8h7', 'a8g2', 'g1h1', 'h6h5', 'h1a1', 'g2g7', 'h7h8', 'g7a7'],
    keyIdeas: [
      'Drive the rook to the edge',
      'Coordinate queen and king',
      'Trap the rook with limited squares',
      'Force the king to block its own rook'
    ]
  },
  {
    id: 'opposite-bishops',
    name: 'Opposite-Colored Bishops',
    description: 'Understand why opposite-colored bishop endgames tend toward draws',
    difficulty: 'intermediate',
    startingFen: '8/5k2/4b3/3P4/4B3/8/5K2/8 w - - 0 1',
    solutionMoves: ['f2e3', 'f7e7', 'e4d3', 'e6d7', 'e3d4', 'e7d6', 'd3e4', 'd6e6'],
    keyIdeas: [
      'Bishops control different colored squares',
      'Blockade on opposite color stops pawns',
      'King cannot assist pawn breakthrough',
      'Usually results in a draw'
    ]
  },
  {
    id: 'two-rooks-checkmate',
    name: 'Two Rooks Checkmate',
    description: 'The simplest checkmate pattern - driving the king to the edge',
    difficulty: 'beginner',
    startingFen: '4k3/8/8/8/8/8/R7/R3K3 w - - 0 1',
    solutionMoves: ['a2a8', 'e8d7', 'a8b8', 'd7c7', 'a1a7', 'c7d6', 'b8b6', 'd6e5', 'a7a5'],
    keyIdeas: [
      'Use rooks to cut off the king',
      'Push the king toward the edge',
      'Alternate rook checks',
      'Deliver checkmate on the back rank'
    ]
  }
];

export default function Endgames() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [selectedScenario, setSelectedScenario] = useState<EndgameScenario | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="gradient-card p-6">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </div>
    );
  }

  if (selectedScenario) {
    return (
      <div className="min-h-screen bg-background">
        <CommunityBar user={user} />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Button
            variant="ghost"
            onClick={() => setSelectedScenario(null)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Endgames
          </Button>

          <EndgameLesson scenario={selectedScenario} user={user} />
        </div>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-500';
      case 'intermediate': return 'text-yellow-500';
      case 'advanced': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CommunityBar user={user} />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            Smart Endgame Training
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Master essential endgame techniques and winning positions. Learn the fundamental patterns that every chess player must know.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {endgameScenarios.map((scenario) => (
            <Card 
              key={scenario.id}
              className="gradient-card group hover:glow-primary transition-all cursor-pointer"
              onClick={() => setSelectedScenario(scenario)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Target className="w-8 h-8 text-primary" />
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-muted ${getDifficultyColor(scenario.difficulty)}`}>
                    {scenario.difficulty}
                  </span>
                </div>
                <CardTitle className="text-xl">{scenario.name}</CardTitle>
                <CardDescription className="text-base">
                  {scenario.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-semibold text-muted-foreground">Key Concepts:</p>
                  <ul className="text-sm space-y-1">
                    {scenario.keyIdeas.slice(0, 2).map((idea, idx) => (
                      <li key={idx} className="text-muted-foreground">• {idea}</li>
                    ))}
                  </ul>
                </div>
                <Button 
                  variant="secondary" 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                >
                  Learn Technique
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
