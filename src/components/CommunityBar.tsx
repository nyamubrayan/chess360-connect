import { Button } from './ui/button';
import { BookOpen, Sword, GraduationCap, Users, MessageSquare, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CommunityBar = () => {
  const navigate = useNavigate();

  const communityLinks = [
    {
      icon: MessageSquare,
      label: 'Community',
      path: '/community',
      description: 'Join discussions'
    },
    {
      icon: BookOpen,
      label: 'Study Rooms',
      path: '/study-rooms',
      description: 'Learn together'
    },
    {
      icon: Sword,
      label: 'Tournaments',
      path: '/tournaments',
      description: 'Compete'
    },
    {
      icon: GraduationCap,
      label: 'Coaches',
      path: '/coaches',
      description: 'Get training'
    },
    {
      icon: Trophy,
      label: 'Leaderboard',
      path: '/leaderboard',
      description: 'Rankings'
    }
  ];

  return (
    <div className="border-b border-border bg-muted/30 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide">
          <div className="flex items-center gap-2 mr-4 min-w-fit">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-semibold">Community</span>
          </div>
          <div className="flex gap-2">
            {communityLinks.map((link) => (
              <Button
                key={link.path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(link.path)}
                className="flex items-center gap-2 min-w-fit hover:bg-primary/10 transition-colors"
              >
                <link.icon className="w-4 h-4" />
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">{link.label}</span>
                  <span className="text-xs text-muted-foreground">{link.description}</span>
                </div>
                <span className="md:hidden text-sm">{link.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
