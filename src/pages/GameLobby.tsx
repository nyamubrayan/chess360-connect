import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Play } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { FriendsDialog } from '@/components/FriendsDialog';

export default function GameLobby() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [timeControl, setTimeControl] = useState('10');
  const [timeIncrement, setTimeIncrement] = useState('0');
  const [isCreating, setIsCreating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchInterval, setSearchInterval] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
      fetchFriends(user.id);
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

  const fetchFriends = async (userId: string) => {
    const { data, error } = await supabase
      .from('friends')
      .select('friend_id, status')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (error) {
      console.error('Error fetching friends:', error);
      return;
    }

    if (data && data.length > 0) {
      const friendIds = data.map(f => f.friend_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', friendIds);

      if (profilesData) {
        const friendsWithProfiles = data.map(friend => ({
          friend_id: friend.friend_id,
          profiles: profilesData.find(p => p.id === friend.friend_id)
        }));
        setFriends(friendsWithProfiles);
      }
    }
  };

  const handleCreateGame = async () => {
    if (!selectedFriend) {
      toast.error('Please select an opponent');
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-chess-game', {
        body: {
          opponentId: selectedFriend,
          timeControl: parseInt(timeControl),
          timeIncrement: parseInt(timeIncrement),
        },
      });

      if (error) throw error;

      toast.success('Game created! Invitation sent.');
      navigate(`/game/${data.game.id}`);
    } catch (error: any) {
      console.error('Error creating game:', error);
      toast.error(error.message || 'Failed to create game');
    } finally {
      setIsCreating(false);
    }
  };

  const handleQuickMatch = async () => {
    setIsSearching(true);

    try {
      // Join matchmaking queue
      const { data: joinData, error: joinError } = await supabase.functions.invoke('find-match', {
        body: {
          action: 'join',
          timeControl: parseInt(timeControl),
          timeIncrement: parseInt(timeIncrement),
        },
      });

      if (joinError) {
        console.error('Join error:', joinError);

        // If the backend reports an active game, find it and redirect
        if (user) {
          const { data: activeGames, error: activeError } = await supabase
            .from('games')
            .select('id')
            .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
            .eq('status', 'active')
            .limit(1);

          if (!activeError && activeGames && activeGames.length > 0) {
            toast.info('You already have an active game. Redirecting...');
            navigate(`/game/${activeGames[0].id}`);
            setIsSearching(false);
            return;
          }
        }

        toast.error(joinError.message || 'Failed to find match');
        setIsSearching(false);
        return;
      }

      // Check if user already has an active game (in case function returns 200 with error payload)
      if (joinData?.error && joinData.gameId) {
        toast.info('You already have an active game. Redirecting...');
        navigate(`/game/${joinData.gameId}`);
        setIsSearching(false);
        return;
      }

      if (joinData.matched) {
        toast.success('Match found!');
        navigate(`/game/${joinData.game.id}`);
        return;
      }

      toast.info('Searching for opponent...');

      // Poll for match every 2 seconds
      const interval = setInterval(async () => {
        const { data: pollData, error: pollError } = await supabase.functions.invoke('find-match', {
          body: {
            action: 'join',
            timeControl: parseInt(timeControl),
            timeIncrement: parseInt(timeIncrement),
          },
        });

        if (pollError) {
          console.error('Poll error:', pollError);
          return;
        }

        if (pollData.matched) {
          clearInterval(interval);
          setIsSearching(false);
          toast.success('Match found!');
          navigate(`/game/${pollData.game.id}`);
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
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="secondary" size="sm" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Home
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Game Lobby</h1>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <FriendsDialog userId={user.id} />
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Match Section */}
          <Card className="gradient-card p-6 glow-primary">
            <h2 className="text-xl font-bold mb-6">Quick Match</h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quick-time">Time Control (minutes)</Label>
                  <Select value={timeControl} onValueChange={setTimeControl} disabled={isSearching}>
                    <SelectTrigger id="quick-time">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 minute (Bullet)</SelectItem>
                      <SelectItem value="3">3 minutes (Blitz)</SelectItem>
                      <SelectItem value="5">5 minutes (Blitz)</SelectItem>
                      <SelectItem value="10">10 minutes (Rapid)</SelectItem>
                      <SelectItem value="15">15 minutes (Rapid)</SelectItem>
                      <SelectItem value="30">30 minutes (Classical)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quick-increment">Increment (seconds)</Label>
                  <Input
                    id="quick-increment"
                    type="number"
                    min="0"
                    max="60"
                    value={timeIncrement}
                    onChange={(e) => setTimeIncrement(e.target.value)}
                    disabled={isSearching}
                  />
                </div>
              </div>

              {!isSearching ? (
                <Button
                  onClick={handleQuickMatch}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Play className="w-5 h-5" />
                  Find Match
                </Button>
              ) : (
                <Button
                  onClick={handleCancelSearch}
                  variant="destructive"
                  className="w-full gap-2"
                  size="lg"
                >
                  Cancel Search
                </Button>
              )}
            </div>
          </Card>

          {/* Challenge Friend Section */}
          <Card className="gradient-card p-6">
            <h2 className="text-xl font-bold mb-6">Challenge a Friend</h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="opponent">Select Opponent</Label>
                <Select value={selectedFriend} onValueChange={setSelectedFriend} disabled={isSearching}>
                  <SelectTrigger id="opponent">
                    <SelectValue placeholder="Choose a friend to play" />
                  </SelectTrigger>
                  <SelectContent>
                    {friends.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No friends available. Add friends first!
                      </div>
                    ) : (
                      friends.map((friend: any) => (
                        <SelectItem key={friend.friend_id} value={friend.friend_id}>
                          {friend.profiles?.display_name || friend.profiles?.username}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCreateGame}
                disabled={isCreating || !selectedFriend || isSearching}
                className="w-full gap-2"
                size="lg"
              >
                <Play className="w-5 h-5" />
                {isCreating ? 'Sending Invitation...' : 'Send Challenge'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}