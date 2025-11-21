import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, ArrowRight, Sparkles, Target, BookOpen } from 'lucide-react';
import { CommunityBar } from '@/components/CommunityBar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Lesson {
  title: string;
  priority: 'high' | 'medium' | 'low';
  category: 'opening' | 'middlegame' | 'endgame' | 'tactics' | 'strategy';
  reason: string;
  targetAreas: string[];
}

export default function Lessons() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
                              // Navigate based on category
                              if (lesson.category === 'opening') navigate('/openings');
                              else if (lesson.category === 'endgame') navigate('/endgames');
                              else if (lesson.category === 'tactics') navigate('/puzzles');
                              else toast.info('This training module is coming soon!');
                            }}
                          >
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
      </div>
    </div>
  );
}
