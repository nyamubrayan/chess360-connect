import { useState } from 'react';
import { Button } from './ui/button';
import { BookOpen, Sword, GraduationCap, MessageSquare, Trophy, Target, Users, Brain, UserIcon, ChevronDown, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { User } from '@supabase/supabase-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface CommunityBarProps {
  user: User | null;
}

export const CommunityBar = ({ user }: CommunityBarProps) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
                
                {/* Mobile Menu Hamburger */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:w-[400px] p-0">
                    <SheetHeader className="p-6 pb-4 border-b">
                      <SheetTitle className="text-left">Menu</SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col gap-1 p-4">
                      {/* Community Links */}
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-muted-foreground mb-2 px-3">Community</p>
                        {communitySubLinks.map((link) => (
                          <Button
                            key={link.path}
                            variant="ghost"
                            onClick={() => {
                              navigate(link.path);
                              setMobileMenuOpen(false);
                            }}
                            className="w-full justify-start gap-3 h-12"
                          >
                            <link.icon className="w-5 h-5" />
                            <span className="font-medium">{link.label}</span>
                          </Button>
                        ))}
                      </div>

                      {/* Main Links */}
                      <div className="mb-4">
                        {mainLinks.map((link) => (
                          <Button
                            key={link.path}
                            variant="ghost"
                            onClick={() => {
                              navigate(link.path);
                              setMobileMenuOpen(false);
                            }}
                            className="w-full justify-start gap-3 h-12"
                          >
                            <link.icon className="w-5 h-5" />
                            <span className="font-medium">{link.label}</span>
                          </Button>
                        ))}
                      </div>

                      {/* User Links */}
                      <div className="border-t pt-4">
                        <p className="text-sm font-semibold text-muted-foreground mb-2 px-3">My Account</p>
                        {userLinks.map((link) => (
                          <Button
                            key={link.path}
                            variant="ghost"
                            onClick={() => {
                              navigate(link.path);
                              setMobileMenuOpen(false);
                            }}
                            className="w-full justify-start gap-3 h-12"
                          >
                            <link.icon className="w-5 h-5" />
                            <span className="font-medium">{link.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <>
                <Button onClick={() => navigate('/auth')} className="h-10 px-6 font-medium hidden lg:flex">
                  Sign In
                </Button>
                
                {/* Mobile Menu for Non-Authenticated Users */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:w-[400px] p-0">
                    <SheetHeader className="p-6 pb-4 border-b">
                      <SheetTitle className="text-left">Menu</SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col gap-1 p-4">
                      <Button 
                        onClick={() => {
                          navigate('/auth');
                          setMobileMenuOpen(false);
                        }} 
                        className="w-full h-12 mb-4"
                      >
                        Sign In
                      </Button>
                      
                      {/* Community Links */}
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-muted-foreground mb-2 px-3">Community</p>
                        {communitySubLinks.map((link) => (
                          <Button
                            key={link.path}
                            variant="ghost"
                            onClick={() => {
                              navigate(link.path);
                              setMobileMenuOpen(false);
                            }}
                            className="w-full justify-start gap-3 h-12"
                          >
                            <link.icon className="w-5 h-5" />
                            <span className="font-medium">{link.label}</span>
                          </Button>
                        ))}
                      </div>

                      {/* Main Links */}
                      {mainLinks.map((link) => (
                        <Button
                          key={link.path}
                          variant="ghost"
                          onClick={() => {
                            navigate(link.path);
                            setMobileMenuOpen(false);
                          }}
                          className="w-full justify-start gap-3 h-12"
                        >
                          <link.icon className="w-5 h-5" />
                          <span className="font-medium">{link.label}</span>
                        </Button>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
