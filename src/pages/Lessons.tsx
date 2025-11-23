import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, ArrowRight, Sparkles, Target, BookOpen, BookMarked } from 'lucide-react';
import { CommunityBar } from '@/components/CommunityBar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { LessonViewer } from '@/components/lessons/LessonViewer';

interface Lesson {
  title: string;
  priority: 'high' | 'medium' | 'low';
  category: 'opening' | 'middlegame' | 'endgame' | 'tactics' | 'strategy';
  reason: string;
  targetAreas: string[];
}

// Sample lesson content with sections
const sampleLessonSections = {
  'Opening Principles': [
    {
      title: 'Control the Center',
      content: 'The center of the chessboard (e4, d4, e5, d5) is the most important area to control in the opening phase.\n\nWhy is the center important?\n- Pieces in the center control more squares\n- Central pawns support piece development\n- Control of the center gives you more space and flexibility\n\nBest ways to control the center:\n1. Occupy it with pawns (e4, d4)\n2. Control it with pieces (knights and bishops)\n3. Challenge opponent\'s central pawns'
    },
    {
      title: 'Develop Your Pieces',
      content: 'Piece development means bringing your knights, bishops, and other pieces from their starting positions to more active squares.\n\nDevelopment guidelines:\n- Knights before bishops (knights have fewer good squares)\n- Develop toward the center\n- Don\'t move the same piece twice in the opening\n- Castle early for king safety\n\nCommon mistakes:\n- Moving too many pawns\n- Bringing out the queen too early\n- Neglecting piece coordination'
    },
    {
      title: 'King Safety',
      content: 'Keeping your king safe is crucial in the opening. The best way to protect your king is through castling.\n\nCastling benefits:\n- Moves king to safety (away from center)\n- Brings rook toward center\n- Connects your rooks\n\nWhen to castle:\n- Usually within first 10 moves\n- After developing knights and bishops\n- Before starting an attack\n\nWarning signs:\n- Open files near your king\n- Missing pawn shield\n- Opponent\'s pieces aimed at your king'
    }
  ],
  'Basic Tactics': [
    {
      title: 'The Fork',
      content: 'A fork is when one piece attacks two or more enemy pieces at the same time.\n\nMost common forks:\n- Knight forks (the knight is excellent for forking)\n- Pawn forks (attacking two pieces)\n- Queen forks (most powerful)\n\nHow to create forks:\n1. Look for undefended pieces\n2. Calculate if you can attack them simultaneously\n3. Check if your opponent can defend both pieces\n\nRemember: The key to successful forks is that your opponent cannot save both pieces in one move.'
    },
    {
      title: 'The Pin',
      content: 'A pin occurs when an attacking piece prevents an enemy piece from moving because doing so would expose a more valuable piece behind it.\n\nTypes of pins:\n- Absolute pin (pinned piece cannot legally move)\n- Relative pin (moving would lose material)\n\nPieces that pin:\n- Bishops (diagonal pins)\n- Rooks (rank/file pins)\n- Queens (any direction)\n\nDefending against pins:\n- Break the pin with another piece\n- Attack the pinning piece\n- Move the valuable piece behind\n- Consider if the pin is truly dangerous'
    },
    {
      title: 'The Skewer',
      content: 'A skewer is the opposite of a pin - a more valuable piece is forced to move, exposing a less valuable piece behind it.\n\nSkewer characteristics:\n- Attacks valuable piece first\n- Forces it to move\n- Captures piece behind\n\nCommon skewers:\n- Rook skewering king and rook\n- Bishop skewing king and queen\n- Queen skewering any pieces\n\nSetting up skewers:\n1. Align enemy pieces on same rank, file, or diagonal\n2. Attack the more valuable piece\n3. Force it to move\n4. Capture the piece behind'
    }
  ]
}

export default function Lessons() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
      fetchRecommendations();
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

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('recommend-lessons');

      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Rate limit reached. Please try again in a moment.');
        } else if (error.message?.includes('402')) {
          toast.error('AI usage limit reached. Please add credits to continue.');
        } else {
          console.error('Error fetching recommendations:', error);
          toast.error('Failed to load personalized recommendations');
        }
        return;
      }

      console.log('Recommendations data:', data);
      setLessons(data.recommendations || []);
      setPlayerStats(data.playerStats || null);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-500 border-green-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'opening': return BookOpen;
      case 'tactics': return Target;
      case 'endgame': return TrendingUp;
      default: return Brain;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'opening': return 'text-blue-500';
      case 'middlegame': return 'text-purple-500';
      case 'endgame': return 'text-green-500';
      case 'tactics': return 'text-orange-500';
      case 'strategy': return 'text-pink-500';
      default: return 'text-primary';
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

  return (
    <div className="min-h-screen bg-background">
      <CommunityBar user={user} />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-4xl lg:text-5xl font-bold">
              Personalized Lessons
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AI-powered learning paths tailored to your playing style and weaknesses based on your game history
          </p>
        </div>

        {/* Stats Overview */}
        {playerStats && (
          <Card className="gradient-card mb-8">
            <CardHeader>
              <CardTitle>Your Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{playerStats.rating}</div>
                  <div className="text-sm text-muted-foreground">Current Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{playerStats.totalGames}</div>
                  <div className="text-sm text-muted-foreground">Games Played</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{playerStats.winRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading ? (
          <Card className="gradient-card p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
              <p className="text-muted-foreground">Analyzing your games and generating personalized recommendations...</p>
            </div>
          </Card>
        ) : lessons.length === 0 ? (
          <Card className="gradient-card p-12">
            <div className="text-center">
              <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Play More Games</h3>
              <p className="text-muted-foreground mb-6">
                We need more game data to generate personalized recommendations. Play at least 5 games to get started!
              </p>
              <Button onClick={() => navigate('/lobby')}>
                Play Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Recommended Lessons */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Recommended For You</h2>
                <Button variant="outline" onClick={fetchRecommendations} disabled={loading}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {lessons.map((lesson, index) => {
                  const CategoryIcon = getCategoryIcon(lesson.category);
                  
                  return (
                    <Card 
                      key={index}
                      className="gradient-card group hover:glow-primary transition-all"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-lg bg-background/50 ${getCategoryColor(lesson.category)}`}>
                              <CategoryIcon className="w-6 h-6" />
                            </div>
                            <div>
                              <CardTitle className="text-xl mb-1">{lesson.title}</CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={getPriorityColor(lesson.priority)}>
                                  {lesson.priority} priority
                                </Badge>
                                <Badge variant="outline" className="capitalize">
                                  {lesson.category}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-primary" />
                              Why This Lesson?
                            </h4>
                            <p className="text-muted-foreground leading-relaxed">{lesson.reason}</p>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Target Areas:</h4>
                            <div className="flex flex-wrap gap-2">
                              {lesson.targetAreas.map((area, i) => (
                                <Badge key={i} variant="secondary">
                                  {area}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <Button 
                            className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                            variant="secondary"
                            onClick={() => {
                              // Check if we have sample sections for this lesson
                              const lessonKey = Object.keys(sampleLessonSections).find(key => 
                                lesson.title.toLowerCase().includes(key.toLowerCase())
                              );
                              
                              if (lessonKey) {
                                setSelectedLesson(lesson.title);
                              } else {
                                // Navigate based on category for other lessons
                                if (lesson.category === 'opening') navigate('/openings');
                                else if (lesson.category === 'endgame') navigate('/endgames');
                                else if (lesson.category === 'tactics') navigate('/puzzles');
                                else toast.info('This training module is coming soon!');
                              }
                            }}
                          >
                            <BookMarked className="w-4 h-4 mr-2" />
                            Start Learning
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Lesson Viewer Modal */}
        {selectedLesson && (() => {
          const lessonKey = Object.keys(sampleLessonSections).find(key => 
            selectedLesson.toLowerCase().includes(key.toLowerCase())
          );
          const sections = lessonKey ? sampleLessonSections[lessonKey as keyof typeof sampleLessonSections] : [];
          const lessonData = lessons.find(l => l.title === selectedLesson);

          return (
            <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-y-auto">
              <div className="container mx-auto px-4 py-8 max-w-4xl">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedLesson(null)}
                  className="mb-4"
                >
                  <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                  Back to Lessons
                </Button>

                <div className="mb-6">
                  <h1 className="text-3xl font-bold mb-2">{selectedLesson}</h1>
                  {lessonData && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {lessonData.category}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(lessonData.priority)}>
                        {lessonData.priority} priority
                      </Badge>
                    </div>
                  )}
                </div>

                <LessonViewer
                  lessonTitle={selectedLesson}
                  lessonCategory={lessonData?.category || 'general'}
                  sections={sections}
                  onComplete={() => {
                    toast.success('Lesson completed! 🎉');
                    setSelectedLesson(null);
                  }}
                />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
