import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Loader2, Zap, Users, Swords, Volume2, VolumeX } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { FriendsDialog } from '@/components/FriendsDialog';
import { CustomTimeDialog } from '@/components/CustomTimeDialog';
import { SpinningWheel } from '@/components/SpinningWheel';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

interface GameTypeStats {
  bulletPlayers: number;
  bulletGames: number;
  blitzPlayers: number;
  blitzGames: number;
  rapidPlayers: number;
  rapidGames: number;
}

interface TimeControl {
  time: number;
  increment: number;
  category: string;
  label: string;
}

const TIME_CONTROLS: TimeControl[] = [
  { time: 1, increment: 0, category: 'Bullet', label: '1+0' },
  { time: 2, increment: 1, category: 'Bullet', label: '2+1' },
  { time: 3, increment: 0, category: 'Blitz', label: '3+0' },
  { time: 3, increment: 2, category: 'Blitz', label: '3+2' },
  { time: 5, increment: 0, category: 'Blitz', label: '5+0' },
  { time: 5, increment: 3, category: 'Blitz', label: '5+3' },
  { time: 10, increment: 0, category: 'Rapid', label: '10+0' },
  { time: 10, increment: 5, category: 'Rapid', label: '10+5' },
  { time: 15, increment: 10, category: 'Rapid', label: '15+10' },
  { time: 30, increment: 0, category: 'Classical', label: '30+0' },
  { time: 30, increment: 20, category: 'Classical', label: '30+20' },
];

export default function GameLobby() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('BULLET');
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchInterval, setSearchInterval] = useState<any>(null);
  const [activeGame, setActiveGame] = useState<any>(null);
  const [loadingActiveGame, setLoadingActiveGame] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameStats, setGameStats] = useState<GameTypeStats>({
    bulletPlayers: 0,
    bulletGames: 0,
    blitzPlayers: 0,
    blitzGames: 0,
    rapidPlayers: 0,
    rapidGames: 0,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
      fetchUserProfile(user.id);
      checkForActiveGame(user.id);
    });

    // Fetch initial stats
    fetchGameStats();

    // Auto-update stats every second
    const statsInterval = setInterval(() => {
      fetchGameStats();
    }, 1000);

    // Set up real-time subscriptions for instant updates
    const gamesChannel = supabase
      .channel('games-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games' },
        () => fetchGameStats()
      )
      .subscribe();

    const queueChannel = supabase
      .channel('queue-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matchmaking_queue' },
        () => fetchGameStats()
      )
      .subscribe();

    // Cleanup: remove user from queue when component unmounts
    return () => {
      clearInterval(statsInterval);
      if (searchInterval) clearInterval(searchInterval);
      
      // Remove from queue on unmount if searching
      if (isSearching) {
        supabase.functions.invoke('find-match', {
          body: { action: 'leave' },
        }).catch(console.error);
      }

      supabase.removeChannel(gamesChannel);
      supabase.removeChannel(queueChannel);
    };
  }, [searchInterval, isSearching]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, bullet_rating, blitz_rating, rapid_rating, bullet_games_played, blitz_games_played, rapid_games_played')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchGameStats = async () => {
    try {
      // Fetch active games count by category
      const { data: activeGames, error: gamesError } = await supabase
        .from('games')
        .select('time_control, time_increment')
        .eq('status', 'active');

      if (gamesError) throw gamesError;

      // Count games by category
      let bulletGames = 0;
      let blitzGames = 0;
      let rapidGames = 0;

      activeGames?.forEach(game => {
        if (game.time_control < 3) {
          bulletGames++;
        } else if (game.time_control < 10) {
          blitzGames++;
        } else {
          rapidGames++;
        }
      });

      // Fetch players in queue by category
      const { data: queueData, error: queueError } = await supabase
        .from('matchmaking_queue')
        .select('time_control');

      if (queueError) throw queueError;

      let bulletPlayers = 0;
      let blitzPlayers = 0;
      let rapidPlayers = 0;

      // Only count players if there are active games in that category
      if (bulletGames > 0) {
        queueData?.forEach(entry => {
          if (entry.time_control < 3) {
            bulletPlayers++;
          }
        });
      }

      if (blitzGames > 0) {
        queueData?.forEach(entry => {
          if (entry.time_control >= 3 && entry.time_control < 10) {
            blitzPlayers++;
          }
        });
      }

      if (rapidGames > 0) {
        queueData?.forEach(entry => {
          if (entry.time_control >= 10) {
            rapidPlayers++;
          }
        });
      }

      setGameStats({
        bulletPlayers,
        bulletGames,
        blitzPlayers,
        blitzGames,
        rapidPlayers,
        rapidGames,
      });
    } catch (error) {
      console.error('Error fetching game stats:', error);
    }
  };

  const checkForActiveGame = async (userId: string) => {
    setLoadingActiveGame(true);
    try {
      const { data: games, error } = await supabase
        .from('games')
        .select(`
          *,
          white_player:profiles!games_white_player_id_fkey(username, rating),
          black_player:profiles!games_black_player_id_fkey(username, rating)
        `)
        .or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (games && games.length > 0) {
        setActiveGame(games[0]);
      }
    } catch (error) {
      console.error('Error checking for active game:', error);
    } finally {
      setLoadingActiveGame(false);
    }
  };

  const resumeGame = () => {
    if (activeGame) {
      navigate(`/game/${activeGame.id}`);
    }
  };

  const handleWheelSelect = async (category: string, timeControl?: { time: number; increment: number; label: string }) => {
    if (isSearching) return;
    setSelectedCategory(category);
    
    if (category === 'CUSTOM MATCH') {
      setCustomDialogOpen(true);
      setSelectedTimeControl(null);
      return;
    }
    
    if (timeControl) {
      const categoryMap: Record<string, string> = {
        'BULLET': 'Bullet',
        'BLITZ': 'Blitz',
        'RAPID': 'Rapid',
        'CLASSIC': 'Classical',
      };
      
      const mappedCategory = categoryMap[category] || category;
      
      const newTimeControl = {
        time: timeControl.time,
        increment: timeControl.increment,
        category: mappedCategory,
        label: timeControl.label
      };
      
      setSelectedTimeControl(newTimeControl);
      
      // Automatically start matchmaking
      setIsSearching(true);
      
      try {
        // Join matchmaking queue
        const { data: joinData, error: joinError } = await supabase.functions.invoke('find-match', {
          body: {
            action: 'join',
            timeControl: newTimeControl.time,
            timeIncrement: newTimeControl.increment,
          },
        });

        if (joinError) {
          console.error('Join error:', joinError);
          toast.error(joinError.message || 'Failed to find match');
          setIsSearching(false);
          return;
        }

        // Check if user already has an active game
        if (joinData?.hasActiveGame && joinData.gameId) {
          toast.info(joinData.message || 'You already have an active game. Redirecting...');
          navigate(`/game/${joinData.gameId}`);
          setIsSearching(false);
          return;
        }

        if (joinData.matched) {
          triggerMatchFoundCelebration();
          toast.success('Match found! 🎉');
          setTimeout(() => {
            navigate(`/game/${joinData.game.id}`);
          }, 500);
          return;
        }

        toast.info('Searching for opponent...');

        // Poll for match every 2 seconds
        const interval = setInterval(async () => {
          const { data: pollData, error: pollError } = await supabase.functions.invoke('find-match', {
            body: {
              action: 'join',
              timeControl: newTimeControl.time,
              timeIncrement: newTimeControl.increment,
            },
          });

          if (pollError) {
            console.error('Poll error:', pollError);
            return;
          }

          // Check if user already has an active game during polling
          if (pollData?.hasActiveGame && pollData.gameId) {
            clearInterval(interval);
            setIsSearching(false);
            toast.info('Redirecting to your active game...');
            navigate(`/game/${pollData.gameId}`);
            return;
          }

          if (pollData.matched) {
            clearInterval(interval);
            setIsSearching(false);
            triggerMatchFoundCelebration();
            toast.success('Match found! 🎉');
            setTimeout(() => {
              navigate(`/game/${pollData.game.id}`);
            }, 500);
          }
        }, 2000);

        setSearchInterval(interval);

      } catch (error: any) {
        console.error('Error finding match:', error);
        toast.error(error.message || 'Failed to find match');
        setIsSearching(false);
      }
    }
  };

  const handleTimeControlSelect = (timeControl: TimeControl) => {
    if (isSearching) return;
    setSelectedTimeControl(timeControl);
  };

  const triggerMatchFoundCelebration = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Confetti from left side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      
      // Confetti from right side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const handleCustomTimeConfirm = (timeControl: number, timeIncrement: number) => {
    const category = 
      timeControl < 3 ? 'Bullet' :
      timeControl < 10 ? 'Blitz' :
      timeControl < 30 ? 'Rapid' : 'Classical';
    
    setSelectedTimeControl({
      time: timeControl,
      increment: timeIncrement,
      category: 'Custom',
      label: `${timeControl}+${timeIncrement}`
    });
  };

  const handleQuickMatch = async () => {
    if (!selectedTimeControl) {
      toast.error('Please select a time control');
      return;
    }

    setIsSearching(true);

    try {
      // Join matchmaking queue
      const { data: joinData, error: joinError } = await supabase.functions.invoke('find-match', {
        body: {
          action: 'join',
          timeControl: selectedTimeControl.time,
          timeIncrement: selectedTimeControl.increment,
        },
      });

      if (joinError) {
        console.error('Join error:', joinError);
        toast.error(joinError.message || 'Failed to find match');
        setIsSearching(false);
        return;
      }

      // Check if user already has an active game
      if (joinData?.hasActiveGame && joinData.gameId) {
        toast.info(joinData.message || 'You already have an active game. Redirecting...');
        navigate(`/game/${joinData.gameId}`);
        setIsSearching(false);
        return;
      }

      if (joinData.matched) {
        triggerMatchFoundCelebration();
        toast.success('Match found! 🎉');
        setTimeout(() => {
          navigate(`/game/${joinData.game.id}`);
        }, 500);
        return;
      }

      toast.info('Searching for opponent...');

      // Poll for match every 2 seconds
      const interval = setInterval(async () => {
        const { data: pollData, error: pollError } = await supabase.functions.invoke('find-match', {
          body: {
            action: 'join',
            timeControl: selectedTimeControl.time,
            timeIncrement: selectedTimeControl.increment,
          },
        });

        if (pollError) {
          console.error('Poll error:', pollError);
          return;
        }

        // Check if user already has an active game during polling
        if (pollData?.hasActiveGame && pollData.gameId) {
          clearInterval(interval);
          setIsSearching(false);
          toast.info('Redirecting to your active game...');
          navigate(`/game/${pollData.gameId}`);
          return;
        }

        if (pollData.matched) {
          clearInterval(interval);
          setIsSearching(false);
          triggerMatchFoundCelebration();
          toast.success('Match found! 🎉');
          setTimeout(() => {
            navigate(`/game/${pollData.game.id}`);
          }, 500);
        }
      }, 2000);

      setSearchInterval(interval);

    } catch (error: any) {
      console.error('Error finding match:', error);
      toast.error(error.message || 'Failed to find match');
      setIsSearching(false);
    }
  };

  const handleCancelSearch = async () => {
    if (searchInterval) {
      clearInterval(searchInterval);
      setSearchInterval(null);
    }

    try {
      await supabase.functions.invoke('find-match', {
        body: { action: 'leave' },
      });
      toast.info('Search cancelled');
    } catch (error) {
      console.error('Error leaving queue:', error);
    }

    setIsSearching(false);
  };

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
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="secondary" size="sm" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Quick Match</h1>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="gap-2"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
            </Button>
            <NotificationBell userId={user.id} />
            <FriendsDialog userId={user.id} />
          </div>
        </div>

        {/* Active Game Card */}
        {!loadingActiveGame && activeGame && (
          <Card className="mb-6 p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-bold mb-2 flex items-center justify-center sm:justify-start gap-2">
                  <Clock className="w-5 h-5 animate-pulse text-primary" />
                  Active Game in Progress
                </h3>
                <div className="flex items-center gap-2 justify-center sm:justify-start text-sm text-muted-foreground flex-wrap">
                  <span className="font-semibold text-foreground">
                    {activeGame.white_player_id === user.id ? activeGame.black_player.username : activeGame.white_player.username}
                  </span>
                  <span>•</span>
                  <span>{Math.floor(activeGame.time_control / 60)}+{activeGame.time_increment} min</span>
                  <span>•</span>
                  <span>Playing as {activeGame.white_player_id === user.id ? 'White' : 'Black'}</span>
                </div>
              </div>
              <Button 
                onClick={resumeGame}
                size="lg"
                className="w-full sm:w-auto"
              >
                Resume Game
              </Button>
            </div>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Game Selection - Left/Main Area */}
          <div className="lg:col-span-8">
            <div className="flex flex-col items-center w-full">
              <SpinningWheel 
                onSelect={handleWheelSelect} 
                disabled={isSearching}
                username={profile?.username}
                bulletStats={{ rating: profile?.bullet_rating || 1200, gamesPlayed: profile?.bullet_games_played || 0 }}
                blitzStats={{ rating: profile?.blitz_rating || 1200, gamesPlayed: profile?.blitz_games_played || 0 }}
                rapidStats={{ rating: profile?.rapid_rating || 1200, gamesPlayed: profile?.rapid_games_played || 0 }}
                onCategoryChange={(category) => setSelectedCategory(category)}
                soundEnabled={soundEnabled}
              />
              
              {/* Searching Status */}
              {isSearching && (
                <div className="mt-8 w-full max-w-2xl mx-auto space-y-4">
                  <div className="flex items-center justify-center gap-3 py-4 animate-pulse">
                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                    <span className="text-lg font-semibold text-muted-foreground">Searching for opponent...</span>
                  </div>
                  <Button
                    onClick={handleCancelSearch}
                    variant="destructive"
                    className="w-full gap-2 h-14 text-lg font-bold tracking-wider rounded-2xl shadow-lg hover:shadow-xl"
                    size="lg"
                  >
                    CANCEL SEARCH
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Live Activity Stats - Right Sidebar */}
          <div className="lg:col-span-4">
            <Card className="sticky top-4 p-6 bg-gradient-to-br from-card via-card to-muted/30 border-2">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Swords className="w-5 h-5 text-primary" />
                Live Activity
              </h2>
              
              <div className="space-y-4">
                {/* Bullet Stats */}
                {selectedCategory === 'BULLET' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="relative overflow-hidden rounded-xl border-2 border-border/50 bg-gradient-to-br from-orange-500/10 to-red-500/10"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5" />
                    <div className="relative p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold">Bullet</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span className="text-sm font-medium">Players</span>
                          </div>
                          <span className="text-2xl font-bold text-foreground">{gameStats.bulletPlayers}</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Swords className="w-4 h-4" />
                            <span className="text-sm font-medium">Games</span>
                          </div>
                          <span className="text-2xl font-bold text-foreground">{gameStats.bulletGames}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Blitz Stats */}
                {selectedCategory === 'BLITZ' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="relative overflow-hidden rounded-xl border-2 border-border/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/10"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5" />
                    <div className="relative p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold">Blitz</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span className="text-sm font-medium">Players</span>
                          </div>
                          <span className="text-2xl font-bold text-foreground">{gameStats.blitzPlayers}</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Swords className="w-4 h-4" />
                            <span className="text-sm font-medium">Games</span>
                          </div>
                          <span className="text-2xl font-bold text-foreground">{gameStats.blitzGames}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Rapid Stats */}
                {selectedCategory === 'RAPID' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="relative overflow-hidden rounded-xl border-2 border-border/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/10"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5" />
                    <div className="relative p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold">Rapid</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span className="text-sm font-medium">Players</span>
                          </div>
                          <span className="text-2xl font-bold text-foreground">{gameStats.rapidPlayers}</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Swords className="w-4 h-4" />
                            <span className="text-sm font-medium">Games</span>
                          </div>
                          <span className="text-2xl font-bold text-foreground">{gameStats.rapidGames}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          </div>
        </div>

        <CustomTimeDialog
          open={customDialogOpen}
          onOpenChange={setCustomDialogOpen}
          onConfirm={handleCustomTimeConfirm}
        />
      </div>
    </div>
  );
}
