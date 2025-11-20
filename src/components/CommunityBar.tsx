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
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Users className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg hidden sm:inline">ChessMaster</span>
          </div>

          {/* Main Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 hover:bg-accent transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Community</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {communitySubLinks.map((link) => (
                  <DropdownMenuItem
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <link.icon className="w-4 h-4" />
                    <span>{link.label}</span>
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
                className="flex items-center gap-2 hover:bg-accent transition-colors"
              >
                <link.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{link.label}</span>
              </Button>
            ))}
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <NotificationBell userId={user.id} />
                <div className="hidden md:flex items-center gap-1">
                  {userLinks.map((link) => (
                    <Button
                      key={link.path}
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(link.path)}
                      className="flex items-center gap-2"
                    >
                      <link.icon className="w-4 h-4" />
                      <span className="text-sm">{link.label}</span>
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <Button size="sm" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden border-t border-border py-2">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 min-w-fit"
                >
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Community</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {communitySubLinks.map((link) => (
                  <DropdownMenuItem
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <link.icon className="w-4 h-4" />
                    <span>{link.label}</span>
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
                className="flex items-center gap-2 min-w-fit"
              >
                <link.icon className="w-4 h-4" />
                <span className="text-xs">{link.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};
