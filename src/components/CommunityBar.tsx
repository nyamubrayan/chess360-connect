import { Button } from './ui/button';
import { BookOpen, Sword, GraduationCap, MessageSquare, Trophy, Target, Users, Brain, UserIcon, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { User } from '@supabase/supabase-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CommunityBarProps {
  user: User | null;
}

export const CommunityBar = ({ user }: CommunityBarProps) => {
  const navigate = useNavigate();

  const communitySubLinks = [
    {
      icon: MessageSquare,
      label: 'Posts',
      path: '/community?tab=posts'
    },
    {
      icon: BookOpen,
      label: 'Study Rooms',
      path: '/community?tab=study-rooms'
    },
    {
      icon: Sword,
      label: 'Tournaments',
      path: '/community?tab=tournaments'
    },
    {
      icon: GraduationCap,
      label: 'Coaches',
      path: '/community?tab=coaches'
    }
  ];

  const mainLinks = [
    {
      icon: Trophy,
      label: 'Leaderboard',
      path: '/leaderboard'
    }
  ];

  const userLinks = [
    {
      icon: UserIcon,
      label: 'Profile',
      path: '/profile'
    },
    {
      icon: Target,
      label: 'Analytics',
      path: '/analytics'
    },
    {
      icon: Brain,
      label: 'Lessons',
      path: '/lessons'
    }
  ];

  return (
    <nav className="w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <Users className="w-7 h-7 text-primary" />
            <span className="font-bold text-xl tracking-tight">ChessMaster</span>
          </div>

          {/* Main Navigation */}
          <div className="hidden lg:flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 h-10 px-4 hover:bg-accent/80 transition-all"
                >
                  <Users className="w-4 h-4" />
                  <span className="font-medium">Community</span>
                  <ChevronDown className="w-4 h-4 transition-transform" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-background/95 backdrop-blur-sm z-50 border shadow-lg">
                {communitySubLinks.map((link) => (
                  <DropdownMenuItem
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className="flex items-center gap-3 cursor-pointer py-2.5 px-3 hover:bg-accent transition-colors"
                  >
                    <link.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{link.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {mainLinks.map((link) => (
              <Button
                key={link.path}
                variant="ghost"
                onClick={() => navigate(link.path)}
                className="flex items-center gap-2 h-10 px-4 hover:bg-accent/80 transition-all"
              >
                <link.icon className="w-4 h-4" />
                <span className="font-medium">{link.label}</span>
              </Button>
            ))}
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <NotificationBell userId={user.id} />
                <div className="hidden lg:flex items-center gap-2">
                  {userLinks.map((link) => (
                    <Button
                      key={link.path}
                      variant="ghost"
                      onClick={() => navigate(link.path)}
                      className="flex items-center gap-2 h-10 px-4 hover:bg-accent/80 transition-all"
                    >
                      <link.icon className="w-4 h-4" />
                      <span className="font-medium">{link.label}</span>
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <Button onClick={() => navigate('/auth')} className="h-10 px-6 font-medium">
                Sign In
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden border-t border-border/40 py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 min-w-fit h-9 px-3 shrink-0"
                >
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Community</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-background/95 backdrop-blur-sm z-50 border shadow-lg">
                {communitySubLinks.map((link) => (
                  <DropdownMenuItem
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className="flex items-center gap-3 cursor-pointer py-2.5 px-3 hover:bg-accent transition-colors"
                  >
                    <link.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{link.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {mainLinks.map((link) => (
              <Button
                key={link.path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(link.path)}
                className="flex items-center gap-2 min-w-fit h-9 px-3 shrink-0"
              >
                <link.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{link.label}</span>
              </Button>
            ))}
            {user && userLinks.map((link) => (
              <Button
                key={link.path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(link.path)}
                className="flex items-center gap-2 min-w-fit h-9 px-3 shrink-0"
              >
                <link.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{link.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};
