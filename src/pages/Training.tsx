import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Target, BookOpen, TrendingUp, ArrowRight, GraduationCap, Clock, Grid3x3 } from 'lucide-react';
import { CommunityBar } from '@/components/CommunityBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Training() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

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

  const trainingCards = [
    {
      icon: Brain,
      title: 'Tactical Puzzles',
      description: 'Sharpen your tactical vision with curated chess puzzles across all difficulty levels',
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-500',
      path: '/puzzles',
      available: true
    },
    {
      icon: BookOpen,
      title: 'Opening Theory',
      description: 'Master chess openings with interactive lessons and practice positions',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-500',
      path: '/openings',
      available: true
    },
    {
      icon: Target,
      title: 'Endgame Training',
      description: 'Perfect your endgame technique with essential positions and strategies',
      gradient: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-500',
      path: '/endgames',
      available: true
    },
    {
      icon: TrendingUp,
      title: 'Personalized Lessons',
      description: 'AI-powered learning paths tailored to your playing style and weaknesses',
      gradient: 'from-orange-500/20 to-amber-500/20',
      iconColor: 'text-orange-500',
      path: '/lessons',
      available: true
    }
  ];

  const chessPieces = [
    {
      name: 'King',
      symbol: '♔',
      movement: 'Moves one square in any direction (horizontally, vertically, or diagonally)',
      special: 'The most important piece - losing your king means losing the game. Can castle with a rook once per game.'
    },
    {
      name: 'Queen',
      symbol: '♕',
      movement: 'Moves any number of squares along a rank, file, or diagonal',
      special: 'The most powerful piece on the board, combining the powers of the rook and bishop.'
    },
    {
      name: 'Rook',
      symbol: '♖',
      movement: 'Moves any number of squares along a rank or file (horizontally or vertically)',
      special: 'Can castle with the king. Worth approximately 5 points.'
    },
    {
      name: 'Bishop',
      symbol: '♗',
      movement: 'Moves any number of squares diagonally',
      special: 'Each player has two bishops - one on light squares and one on dark squares. Worth approximately 3 points.'
    },
    {
      name: 'Knight',
      symbol: '♘',
      movement: 'Moves in an "L" shape: two squares in one direction and one square perpendicular, or vice versa',
      special: 'The only piece that can jump over other pieces. Worth approximately 3 points.'
    },
    {
      name: 'Pawn',
      symbol: '♙',
      movement: 'Moves forward one square, or two squares on its first move. Captures diagonally forward one square.',
      special: 'Can promote to any piece (usually queen) when reaching the opposite end. Can capture en passant.'
    }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="gradient-card p-6">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CommunityBar user={user} />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            Smart Training Center
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Master chess from the ground up. Start with fundamentals or jump into advanced training modules tailored to your skill level.
          </p>
        </div>

        <Tabs defaultValue="modules" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="basics" className="text-base">
              <GraduationCap className="w-4 h-4 mr-2" />
              Chess Basics
            </TabsTrigger>
            <TabsTrigger value="modules" className="text-base">
              <Brain className="w-4 h-4 mr-2" />
              Training Modules
            </TabsTrigger>
          </TabsList>

          {/* Chess Basics Tab */}
          <TabsContent value="basics" className="space-y-8">
            {/* Introduction */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-2xl">Welcome to Chess!</CardTitle>
                <CardDescription className="text-base">
                  Chess is a two-player strategy board game played on an 8×8 checkered board. The objective is to checkmate your opponent's king.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground leading-relaxed">
                  Chess has been played for over 1500 years and remains one of the most popular strategic games worldwide. 
                  Each player begins with 16 pieces: one king, one queen, two rooks, two bishops, two knights, and eight pawns.
                </p>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="font-semibold text-primary mb-2">The Goal of Chess:</p>
                  <p className="text-foreground">
                    Checkmate your opponent's king - put it under attack in a way that it cannot escape. 
                    The game can also end in a draw under certain conditions.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* The Chessboard */}
            <Card className="gradient-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Grid3x3 className="w-6 h-6 text-primary" />
                  <CardTitle className="text-2xl">The Chessboard & Notation</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <p className="text-foreground">
                    The chessboard consists of 64 squares arranged in an 8×8 grid. Squares alternate between light and dark colors.
                  </p>
                  
                  {/* Board Illustration */}
                  <div className="bg-muted/20 p-6 rounded-lg">
                    <div className="max-w-md mx-auto">
                      <div className="grid grid-cols-8 gap-0 border-2 border-border">
                        {Array.from({ length: 8 }, (_, rank) => 
                          Array.from({ length: 8 }, (_, file) => {
                            const isDark = (rank + file) % 2 === 1;
                            const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                            const ranks = 8 - rank;
                            return (
                              <div 
                                key={`${rank}-${file}`}
                                className={`aspect-square flex items-center justify-center text-xs font-mono relative ${
                                  isDark ? 'bg-primary/20' : 'bg-background'
                                }`}
                              >
                                {rank === 7 && (
                                  <span className="absolute bottom-0.5 left-1 text-[10px] text-muted-foreground">
                                    {files[file]}
                                  </span>
                                )}
                                {file === 7 && (
                                  <span className="absolute top-0.5 right-1 text-[10px] text-muted-foreground">
                                    {ranks}
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-accent/10 p-4 rounded-lg space-y-2">
                    <p className="font-semibold text-primary">Board Coordinates:</p>
                    <ul className="space-y-2 text-foreground ml-4">
                      <li>• <strong>Files:</strong> Columns labeled a-h (left to right)</li>
                      <li>• <strong>Ranks:</strong> Rows labeled 1-8 (bottom to top for White)</li>
                      <li>• <strong>Example:</strong> "e4" refers to the square on the e-file and 4th rank</li>
                      <li>• <strong>Light square on right:</strong> Always position the board with a light square in the bottom-right corner</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chess Clocks */}
            <Card className="gradient-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="w-6 h-6 text-primary" />
                  <CardTitle className="text-2xl">Chess Clocks & Time Controls</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground">
                  Chess clocks ensure fair play by giving each player a set amount of time to complete their moves. 
                  After making a move, you press your button, which stops your clock and starts your opponent's.
                </p>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-muted/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-primary mb-2">Common Time Controls:</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>Bullet:</strong> 1-2 minutes per player</li>
                      <li>• <strong>Blitz:</strong> 3-5 minutes per player</li>
                      <li>• <strong>Rapid:</strong> 10-25 minutes per player</li>
                      <li>• <strong>Classical:</strong> 30+ minutes per player</li>
                    </ul>
                  </div>
                  
                  <div className="bg-accent/10 p-4 rounded-lg">
                    <h4 className="font-semibold text-primary mb-2">Time Increments:</h4>
                    <p className="text-sm text-foreground">
                      Many games include an increment - bonus time added after each move. 
                      For example, "5+3" means 5 minutes base time with 3 seconds added per move.
                    </p>
                  </div>
                </div>

                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong className="text-destructive">Important:</strong> If your time runs out, you lose the game immediately (unless your opponent has insufficient material to checkmate).
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Piece Movements */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-2xl">How Chess Pieces Move</CardTitle>
                <CardDescription className="text-base">
                  Each piece has unique movement patterns. Master these to control the board effectively.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {chessPieces.map((piece, index) => (
                  <div 
                    key={piece.name}
                    className="bg-gradient-to-r from-muted/20 to-transparent p-6 rounded-lg border border-border hover:border-primary/50 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row items-start gap-6">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-4xl">{piece.symbol}</div>
                          <h3 className="text-xl font-bold text-primary">{piece.name}</h3>
                        </div>
                        <p className="text-foreground">
                          <strong>Movement:</strong> {piece.movement}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          <strong>Special:</strong> {piece.special}
                        </p>
                      </div>
                      
                      {/* Animated Movement Demonstration */}
                      <div className="w-full lg:w-64 flex-shrink-0">
                        <div className="bg-muted/10 p-2 rounded-lg">
                          <div className="grid grid-cols-5 gap-0.5 w-full aspect-square">
                            {Array.from({ length: 25 }, (_, i) => {
                              const row = Math.floor(i / 5);
                              const col = i % 5;
                              const centerRow = 2;
                              const centerCol = 2;
                              const isCenter = row === centerRow && col === centerCol;
                              
                              let isHighlighted = false;
                              
                              // Highlight possible moves based on piece type
                              if (piece.name === 'King') {
                                isHighlighted = Math.abs(row - centerRow) <= 1 && Math.abs(col - centerCol) <= 1 && !isCenter;
                              } else if (piece.name === 'Queen') {
                                isHighlighted = (row === centerRow || col === centerCol || Math.abs(row - centerRow) === Math.abs(col - centerCol)) && !isCenter;
                              } else if (piece.name === 'Rook') {
                                isHighlighted = (row === centerRow || col === centerCol) && !isCenter;
                              } else if (piece.name === 'Bishop') {
                                isHighlighted = Math.abs(row - centerRow) === Math.abs(col - centerCol) && !isCenter;
                              } else if (piece.name === 'Knight') {
                                const rowDiff = Math.abs(row - centerRow);
                                const colDiff = Math.abs(col - centerCol);
                                isHighlighted = (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
                              } else if (piece.name === 'Pawn') {
                                isHighlighted = (col === centerCol && row === centerRow - 1) || 
                                               (col === centerCol && row === centerRow - 2) ||
                                               ((col === centerCol - 1 || col === centerCol + 1) && row === centerRow - 1);
                              }
                              
                              return (
                                <div
                                  key={i}
                                  className={`aspect-square flex items-center justify-center text-2xl rounded-sm transition-all duration-300 ${
                                    (row + col) % 2 === 0 ? 'bg-background' : 'bg-primary/20'
                                  } ${
                                    isCenter 
                                      ? 'animate-pulse' 
                                      : isHighlighted 
                                      ? 'bg-primary/40 animate-[pulse_2s_ease-in-out_infinite]' 
                                      : ''
                                  }`}
                                  style={{
                                    animationDelay: isHighlighted ? `${Math.random() * 0.5}s` : '0s'
                                  }}
                                >
                                  {isCenter && <span className="animate-scale-in">{piece.symbol}</span>}
                                  {isHighlighted && <span className="text-xs text-primary-foreground opacity-60">•</span>}
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-center text-muted-foreground mt-2">Possible moves highlighted</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Ready to Play */}
            <Card className="gradient-card border-primary/20">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">Ready to Play?</h3>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Now that you understand the basics, it's time to start your chess journey! 
                  Explore our training modules to improve your skills.
                </p>
                <Button 
                  size="lg" 
                  onClick={() => navigate('/lobby')}
                  className="mr-4"
                >
                  Play a Game
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => document.querySelector('[value="modules"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}
                >
                  Explore Training
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Modules Tab */}
          <TabsContent value="modules" className="space-y-8">
            {/* Training Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {trainingCards.map((card) => (
                <Card 
                  key={card.path}
                  className={`gradient-card group hover:glow-primary transition-all cursor-pointer relative overflow-hidden ${!card.available ? 'opacity-60' : ''}`}
                  onClick={() => card.available && navigate(card.path)}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-50`} />
                  
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg bg-background/50 backdrop-blur-sm ${card.iconColor}`}>
                        <card.icon className="w-8 h-8" />
                      </div>
                      {!card.available && (
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-muted">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-2xl mt-4">{card.title}</CardTitle>
                    <CardDescription className="text-base">
                      {card.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="relative">
                    {card.available ? (
                      <Button 
                        variant="secondary" 
                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                      >
                        Start Training
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        Coming Soon
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Stats Section */}
            <Card className="gradient-card p-6">
              <h2 className="text-2xl font-bold mb-4">Your Training Stats</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">0</div>
                  <div className="text-sm text-muted-foreground">Puzzles Solved</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">0</div>
                  <div className="text-sm text-muted-foreground">Lessons Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">0</div>
                  <div className="text-sm text-muted-foreground">Training Hours</div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
