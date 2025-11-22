import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Puzzle, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/chess-hero.jpg";

interface HeroSectionProps {
  user: User | null;
}

export const HeroSection = ({ user }: HeroSectionProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("username, display_name, avatar_url, rating")
          .eq("id", user.id)
          .single();
        
        if (data) setProfile(data);
      };
      fetchProfile();
    }
  }, [user]);

  return (
    <section className="relative overflow-hidden py-20 sm:py-32 px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>
      <div 
        className="absolute inset-0 opacity-5 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      ></div>
      
      <div className="container mx-auto max-w-6xl relative z-10">
        {user && profile && (
          <div className="flex items-center justify-center gap-4 mb-8 p-4 bg-card/50 backdrop-blur-sm rounded-lg border border-border w-fit mx-auto">
            <Avatar className="w-16 h-16 border-2 border-primary">
              <AvatarImage src={profile.avatar_url} alt={profile.username} />
              <AvatarFallback>{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <h2 className="text-xl font-bold">{profile.display_name || profile.username}</h2>
              <p className="text-muted-foreground">Rating: {profile.rating || 1200}</p>
            </div>
          </div>
        )}
        
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
              Master Chess with{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                AI-Powered
              </span>{" "}
              Intelligence
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Experience the future of chess learning. Get real-time analysis, personalized training, 
              and join a global community of players advancing together.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button 
              size="lg" 
              className="text-lg px-8 h-14 shadow-lg hover:shadow-xl transition-all hover:scale-105"
              onClick={() => navigate("/lobby")}
            >
              <Play className="w-5 h-5 mr-2" />
              Start Playing Now
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 h-14 border-2 hover:scale-105 transition-all"
              onClick={() => navigate("/tournaments")}
            >
              <Trophy className="w-5 h-5 mr-2" />
              Tournaments
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 h-14 border-2 hover:scale-105 transition-all"
              onClick={() => navigate("/puzzles")}
            >
              <Puzzle className="w-5 h-5 mr-2" />
              Solve Puzzles
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
