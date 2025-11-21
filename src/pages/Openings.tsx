import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, ChevronRight } from 'lucide-react';
import { CommunityBar } from '@/components/CommunityBar';
import { OpeningLesson } from '@/components/openings/OpeningLesson';

export interface Opening {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  moves: string[];
  color: 'white' | 'black';
  category: string;
  variations: Array<{
    name: string;
    moves: string[];
    explanation: string;
  }>;
  keyIdeas: string[];
  commonMistakes: string[];
}

const openingsData: Opening[] = [
  {
    id: 'italian-game',
    name: 'Italian Game',
    description: 'One of the oldest and most classical openings. White develops quickly and aims to control the center.',
    difficulty: 'beginner',
    color: 'white',
    category: 'King Pawn Openings',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    keyIdeas: [
      'Rapid piece development',
      'Control of the center with e4',
      'Bishop on c4 targets f7, the weakest square in Black\'s camp',
      'Prepare castling kingside for safety'
    ],
    commonMistakes: [
      'Moving the bishop too early without developing knights',
      'Neglecting castling for too long',
      'Not controlling the center with pawns and pieces'
    ],
    variations: [
      {
        name: 'Giuoco Piano',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
        explanation: 'The "Quiet Game" - both sides develop symmetrically. White often continues with c3 and d4 to challenge the center.'
      },
      {
        name: 'Two Knights Defense',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'],
        explanation: 'Black develops the knight instead of the bishop. Leads to sharp tactical positions.'
      }
    ]
  },
  {
    id: 'queens-gambit',
    name: "Queen's Gambit",
    description: 'A classical opening where White offers a pawn to gain control of the center. One of the most popular openings at all levels.',
    difficulty: 'intermediate',
    color: 'white',
    category: 'Queen Pawn Openings',
    moves: ['d4', 'd5', 'c4'],
    keyIdeas: [
      'Control the center with d4 and c4',
      'The c4 pawn is not a real gambit - Black cannot hold the pawn',
      'Develop pieces harmoniously with Nc3, Nf3, and Bg5 or Bf4',
      'Create pressure on Black\'s position'
    ],
    commonMistakes: [
      'Taking the c4 pawn as Black and trying to hold it',
      'Developing the queen too early',
      'Not understanding the pawn structures that arise'
    ],
    variations: [
      {
        name: 'Accepted',
        moves: ['d4', 'd5', 'c4', 'dxc4'],
        explanation: 'Black accepts the gambit. White usually continues Nf3 and e3 to recapture the pawn with good central control.'
      },
      {
        name: 'Declined',
        moves: ['d4', 'd5', 'c4', 'e6'],
        explanation: 'The most solid response. Black supports the d5 pawn and aims for a strong position.'
      },
      {
        name: 'Slav Defense',
        moves: ['d4', 'd5', 'c4', 'c6'],
        explanation: 'Black supports d5 with c6, keeping options open for developing the light-squared bishop.'
      }
    ]
  },
  {
    id: 'sicilian-defense',
    name: 'Sicilian Defense',
    description: 'The most popular and combative response to 1.e4. Black fights for the center asymmetrically and creates imbalanced positions.',
    difficulty: 'advanced',
    color: 'black',
    category: 'Semi-Open Games',
    moves: ['e4', 'c5'],
    keyIdeas: [
      'Fight for the center with c5 instead of e5',
      'Create asymmetrical pawn structures',
      'Generate counterplay on the queenside',
      'Open the c-file for the rooks'
    ],
    commonMistakes: [
      'Developing pieces without understanding the pawn structure',
      'Castle into an attack without preparation',
      'Not creating counterplay when White attacks'
    ],
    variations: [
      {
        name: 'Open Sicilian',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4'],
        explanation: 'The main line. White opens the center and both sides prepare for a complex middlegame.'
      },
      {
        name: 'Najdorf Variation',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
        explanation: 'One of the sharpest variations. Black prepares b5 expansion and keeps maximum flexibility.'
      },
      {
        name: 'Dragon Variation',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'],
        explanation: 'Black fianchettoes the bishop on g7. Leads to opposite-side castling and attacking races.'
      }
    ]
  },
  {
    id: 'french-defense',
    name: 'French Defense',
    description: 'A solid defense where Black builds a strong pawn chain and fights for central control. Popular at all levels.',
    difficulty: 'intermediate',
    color: 'black',
    category: 'Semi-Open Games',
    moves: ['e4', 'e6'],
    keyIdeas: [
      'Build a solid pawn structure with d5',
      'Control the center from a distance',
      'Create counterplay on the queenside',
      'Trade the light-squared bishop (problem piece)'
    ],
    commonMistakes: [
      'Not addressing the bad light-squared bishop',
      'Allowing White to build a strong center without challenge',
      'Passive play without creating counterplay'
    ],
    variations: [
      {
        name: 'Winawer Variation',
        moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4'],
        explanation: 'The most aggressive line. Black pins the knight and prepares to double White\'s pawns.'
      },
      {
        name: 'Classical Variation',
        moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'],
        explanation: 'Solid and flexible. Black develops naturally and keeps options open.'
      }
    ]
  },
  {
    id: 'kings-indian',
    name: "King's Indian Defense",
    description: 'A hypermodern defense where Black allows White to build a large pawn center, then attacks it. Leads to sharp, dynamic positions.',
    difficulty: 'advanced',
    color: 'black',
    category: 'Indian Defenses',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'],
    keyIdeas: [
      'Fianchetto the kingside bishop on g7',
      'Allow White a pawn center, then attack it',
      'Launch a kingside pawn storm with f5 or e5',
      'Create imbalanced positions with mutual attacks'
    ],
    commonMistakes: [
      'Not coordinating the pawn breaks (e5 or c5) with piece play',
      'Launching attacks without proper preparation',
      'Allowing White to dominate the center without counterplay'
    ],
    variations: [
      {
        name: 'Classical Variation',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5'],
        explanation: 'The main line. Black strikes at White\'s center with e5, leading to complex middlegames.'
      },
      {
        name: 'Sämisch Variation',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3'],
        explanation: 'White reinforces the center and prepares Be3. Leads to sharp opposite-side castling battles.'
      }
    ]
  },
  {
    id: 'london-system',
    name: 'London System',
    description: 'A solid and flexible opening system for White. Easy to learn and leads to comfortable positions.',
    difficulty: 'beginner',
    color: 'white',
    category: 'Queen Pawn Openings',
    moves: ['d4', 'd5', 'Bf4'],
    keyIdeas: [
      'Develop the bishop to f4 before playing e3',
      'Build a solid pawn structure with d4, e3, c3',
      'Castle kingside and aim for a comfortable middlegame',
      'Play for slow strategic pressure'
    ],
    commonMistakes: [
      'Playing e3 before Bf4, blocking the bishop',
      'Not understanding when to expand with e4',
      'Being too passive and allowing Black equality easily'
    ],
    variations: [
      {
        name: 'Standard Setup',
        moves: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5', 'c3'],
        explanation: 'The typical London structure. White builds solidly and looks for the right moment to expand.'
      },
      {
        name: 'Accelerated London',
        moves: ['d4', 'Nf6', 'Bf4'],
        explanation: 'Playing Bf4 even earlier. A more flexible move order that avoids some Black setups.'
      }
    ]
  }
];

export default function Openings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const selectedOpeningId = searchParams.get('opening');
  const selectedOpening = openingsData.find(o => o.id === selectedOpeningId);

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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="gradient-card p-6">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </div>
    );
  }

  if (selectedOpening) {
    return <OpeningLesson opening={selectedOpening} onBack={() => navigate('/openings')} user={user} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <CommunityBar user={user} />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="secondary" size="sm" onClick={() => navigate('/training')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Smart Training
          </Button>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
            <BookOpen className="w-10 h-10" />
            Opening Theory
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Master popular chess openings with interactive lessons. Learn the key ideas, common variations, and typical plans.
          </p>
        </div>

        {/* Category: King Pawn Openings */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">King Pawn Openings (1.e4)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openingsData
              .filter(opening => opening.category === 'King Pawn Openings' || opening.category === 'Semi-Open Games')
              .map((opening) => (
                <Card 
                  key={opening.id}
                  className="gradient-card hover:glow-primary transition-all cursor-pointer group"
                  onClick={() => navigate(`/openings?opening=${opening.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={getDifficultyColor(opening.difficulty)}>
                        {opening.difficulty}
                      </Badge>
                      <Badge variant="outline">
                        {opening.color === 'white' ? '♔' : '♚'} {opening.color}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {opening.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {opening.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {opening.variations.length} variation{opening.variations.length !== 1 ? 's' : ''}
                      </span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* Category: Queen Pawn Openings */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Queen Pawn Openings (1.d4)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openingsData
              .filter(opening => opening.category === 'Queen Pawn Openings' || opening.category === 'Indian Defenses')
              .map((opening) => (
                <Card 
                  key={opening.id}
                  className="gradient-card hover:glow-primary transition-all cursor-pointer group"
                  onClick={() => navigate(`/openings?opening=${opening.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={getDifficultyColor(opening.difficulty)}>
                        {opening.difficulty}
                      </Badge>
                      <Badge variant="outline">
                        {opening.color === 'white' ? '♔' : '♚'} {opening.color}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {opening.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {opening.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {opening.variations.length} variation{opening.variations.length !== 1 ? 's' : ''}
                      </span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
