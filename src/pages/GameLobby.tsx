import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { FriendsDialog } from '@/components/FriendsDialog';
import { CustomTimeDialog } from '@/components/CustomTimeDialog';
import { SpinningWheel } from '@/components/SpinningWheel';
import confetti from 'canvas-confetti';

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
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Bullet');
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchInterval, setSearchInterval] = useState<any>(null);
  const [activeGame, setActiveGame] = useState<any>(null);
  const [loadingActiveGame, setLoadingActiveGame] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
      checkForActiveGame(user.id);
    });

    // Cleanup: remove user from queue when component unmounts
    return () => {
      if (searchInterval) clearInterval(searchInterval);
      
      // Remove from queue on unmount if searching
      if (isSearching) {
        supabase.functions.invoke('find-match', {
          body: { action: 'leave' },
        }).catch(console.error);
      }
    };
  }, [searchInterval, isSearching]);

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

  const handleWheelSelect = (category: string) => {
    if (isSearching) return;
    setSelectedCategory(category);
    
    if (category === 'CUSTOM MATCH') {
      setCustomDialogOpen(true);
      setSelectedTimeControl(null);
      return;
    }
    
    // Map wheel category names to time control categories
    const categoryMap: Record<string, string> = {
      'BULLET': 'Bullet',
      'BLITZ': 'Blitz',
      'RAPID': 'Rapid',
      'CLASSIC': 'Classical',
    };
    
    const mappedCategory = categoryMap[category] || category;
    
    // Auto-select first time control for category
    const defaultTimeControl = TIME_CONTROLS.find(tc => tc.category === mappedCategory);
    if (defaultTimeControl) {
      setSelectedTimeControl(defaultTimeControl);
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
      <div className="container mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="secondary" size="sm" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Quick Match</h1>
          <div className="flex items-center gap-1 sm:gap-2">
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

        {/* Spinning Wheel */}
        <div className="flex flex-col items-center mb-8">
          <SpinningWheel onSelect={handleWheelSelect} disabled={isSearching} />
          
          {/* Find Opponent Button - appears below wheel */}
          <div className="mt-8 w-full max-w-md mx-auto space-y-4">
            {!isSearching ? (
              <>
                {selectedCategory !== 'CUSTOM MATCH' && (
                  <Button
                    onClick={handleQuickMatch}
                    disabled={!selectedTimeControl}
                    variant="outline"
                    className="w-full gap-2 h-14 text-lg font-bold tracking-wider border-2 border-primary/60 bg-primary/10 hover:bg-primary/20 hover:border-primary shadow-lg hover:shadow-xl transition-all animate-fade-in rounded-xl"
                    size="lg"
                  >
                    FIND OPPONENT
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3 py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-muted-foreground">Searching for opponent...</span>
                </div>
                <Button
                  onClick={handleCancelSearch}
                  variant="destructive"
                  className="w-full gap-2 h-14 text-lg font-bold tracking-wider rounded-xl"
                  size="lg"
                >
                  CANCEL SEARCH
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <CustomTimeDialog
        open={customDialogOpen}
        onOpenChange={setCustomDialogOpen}
        onConfirm={handleCustomTimeConfirm}
      />
    </div>
  );
}
