import { useState } from 'react';
import { Button } from './ui/button';
import { Trophy, Target, UserIcon, Menu, GraduationCap, Swords, Home, Users, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { User } from '@supabase/supabase-js';
import chessafariLogo from '@/assets/chessafari-logo.png';
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

  const mainLinks = [
    {
      icon: Home,
      label: 'Home',
      path: '/'
    },
    {
      icon: GraduationCap,
      label: 'Smart Training',
      path: '/training'
    },
    {
      icon: Sparkles,
      label: 'Highlights',
      path: '/highlights'
    },
    {
      icon: Users,
      label: 'ChessMate Networking',
      path: '/connect'
    },
    {
      icon: Swords,
      label: 'Tournaments',
      path: '/tournaments'
    },
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
    }
  ];

  return (
    <nav className="w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 w-full">
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <img src={chessafariLogo} alt="Chessafari" className="h-10 w-auto" />
          </div>

          {/* Main Navigation */}
          <div className="hidden lg:flex items-center gap-2">
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
