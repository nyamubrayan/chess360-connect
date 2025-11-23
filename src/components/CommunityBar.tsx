import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Trophy, Target, UserIcon, Menu, GraduationCap, Swords, Home, Users, Sparkles, Newspaper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
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

      // Set up online presence
      const channel = supabase.channel('online-users');
      
      channel
        .on('presence', { event: 'sync' }, () => {
          // Online status synced
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            });
          }
        });

      return () => {
        channel.untrack();
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

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
      icon: Newspaper,
      label: 'News & Events',
      path: '/news'
    },
    {
      icon: Trophy,
      label: 'Leaderboard',
      path: '/leaderboard'
    }
  ];

  const userLinks = [
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
            <img src={chessafariLogo} alt="Chessafari" className="h-10 w-auto" width="45" height="40" />
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
                
                {/* Profile Display */}
                {profile && (
                  <div 
                    className="hidden lg:flex items-center gap-3 px-3 py-2 rounded-lg bg-card/50 border border-border cursor-pointer hover:bg-card/70 transition-all"
                    onClick={() => navigate('/profile')}
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10 border-2 border-primary">
                        <AvatarImage src={profile.avatar_url} alt={profile.username} />
                        <AvatarFallback>{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {/* Online Status Indicator */}
                      <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-success border-2 border-background"></span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm leading-tight">{profile.display_name || profile.username}</p>
                      <p className="text-xs text-muted-foreground">Rating: {profile.rating || 1200}</p>
                    </div>
                  </div>
                )}
                
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
                      {/* Profile Section */}
                      {profile && (
                        <div 
                          className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-card/50 border border-border cursor-pointer hover:bg-card/70 transition-all"
                          onClick={() => {
                            navigate('/profile');
                            setMobileMenuOpen(false);
                          }}
                        >
                          <div className="relative">
                            <Avatar className="w-12 h-12 border-2 border-primary">
                              <AvatarImage src={profile.avatar_url} alt={profile.username} />
                              <AvatarFallback>{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            {/* Online Status Indicator */}
                            <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-success border-2 border-background"></span>
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-base leading-tight">{profile.display_name || profile.username}</p>
                            <p className="text-sm text-muted-foreground">Rating: {profile.rating || 1200}</p>
                          </div>
                        </div>
                      )}
                      
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
