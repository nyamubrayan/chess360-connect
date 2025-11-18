import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Zap, Brain, Users, Target, Sparkles, User as UserIcon, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/chess-hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { NotificationBell } from "@/components/NotificationBell";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Learning",
      description: "Personalized training paths that adapt to your skill level and playing style"
    },
    {
      icon: Zap,
      title: "Real-Time Analysis",
      description: "Get instant feedback and move suggestions powered by advanced AI"
    },
    {
      icon: Trophy,
      title: "Gamified Progress",
      description: "Earn badges, complete quests, and climb the ranks as you improve"
    },
    {
      icon: Users,
      title: "Community Hub",
      description: "Join study rooms, tournaments, and connect with players worldwide"
    },
    {
      icon: Target,
      title: "Deep Analytics",
      description: "Track your strengths, weaknesses, and improvement over time"
    },
    {
      icon: Sparkles,
      title: "Immersive Experience",
      description: "3D boards, voice commands, and AR support for the future of chess"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 gradient-hero opacity-10"></div>
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        ></div>
        <div className="absolute top-4 right-4 flex gap-2 z-20">
          {user ? (
            <>
              <NotificationBell userId={user.id} />
              <Button variant="outline" onClick={() => navigate('/profile')}>
                <UserIcon className="mr-2 w-4 h-4" />
                Profile
              </Button>
              <Button variant="outline" onClick={() => navigate('/analytics')}>
                <Target className="mr-2 w-4 h-4" />
                Analytics
              </Button>
              <Button variant="outline" onClick={() => navigate('/community')}>
                <Users className="mr-2 w-4 h-4" />
                Community
              </Button>
              <Button variant="outline" onClick={() => navigate('/lessons')}>
                <Brain className="mr-2 w-4 h-4" />
                Lessons
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          )}
        </div>
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-6 mb-12">
            <div className="inline-block">
              <h1 className="text-6xl md:text-7xl font-bold mb-4">
                Chess, <span className="text-gradient">Reimagined</span>
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the next generation of chess with AI-powered learning, immersive technology, 
              and a vibrant community. Play smarter, learn faster, achieve more.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                className="gradient-hero glow-primary text-lg px-8 hover:scale-105 transition-transform gap-2"
                onClick={() => navigate("/lobby")}
              >
                <Play className="w-5 h-5" />
                Find Game
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 hover:scale-105 transition-transform"
                onClick={() => navigate("/leaderboard")}
              >
                <Trophy className="w-5 h-5 mr-2" />
                Leaderboard
              </Button>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-20">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index} 
                  className="gradient-card border-border p-6 hover:scale-105 transition-all duration-300 cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">100K+</div>
              <div className="text-muted-foreground">Active Players</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-success">1M+</div>
              <div className="text-muted-foreground">Games Analyzed</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-accent">500+</div>
              <div className="text-muted-foreground">AI Lessons</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-gold">24/7</div>
              <div className="text-muted-foreground">AI Support</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
