import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Target, BookOpen, TrendingUp, ArrowRight } from 'lucide-react';
import { CommunityBar } from '@/components/CommunityBar';

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
      available: false
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
            Training Center
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Improve your chess skills with our comprehensive training modules. From tactical puzzles to personalized lessons, everything you need to level up your game.
          </p>
        </div>

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
        <Card className="gradient-card mt-8 p-6">
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
      </div>
    </div>
  );
}
