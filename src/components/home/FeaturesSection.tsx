import { Card } from "@/components/ui/card";
import { Brain, Zap, Trophy, Users, Target, Sparkles } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
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

export const FeaturesSection = () => {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            Why Choose Our Platform?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to become a better chess player, all in one place
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="p-6 lg:p-8 border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-300 group bg-card"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
