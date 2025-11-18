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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
      fetchFriends(user.id);
    });
  }, []);

  const fetchFriends = async (userId: string) => {
    const { data } = await supabase
      .from('friends')
      .select(`friend_id, profiles!friends_friend_id_fkey (id, username, display_name)`)
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (data) {
      setFriends(data);
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

      toast.success('Game created!');
      navigate(`/game/${data.game.id}`);
    } catch (error: any) {
      console.error('Error creating game:', error);
      toast.error(error.message || 'Failed to create game');
    } finally {
      setIsCreating(false);
    }
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

        <Card className="gradient-card p-6 glow-primary">
          <h2 className="text-xl font-bold mb-6">Challenge a Friend</h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="opponent">Select Opponent</Label>
              <Select value={selectedFriend} onValueChange={setSelectedFriend}>
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
                        {friend.profiles?.username || friend.profiles?.display_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time-control">Time Control (minutes)</Label>
                <Select value={timeControl} onValueChange={setTimeControl}>
                  <SelectTrigger id="time-control">
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
                <Label htmlFor="increment">Increment (seconds)</Label>
                <Input
                  id="increment"
                  type="number"
                  min="0"
                  max="60"
                  value={timeIncrement}
                  onChange={(e) => setTimeIncrement(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={handleCreateGame}
              disabled={isCreating || !selectedFriend}
              className="w-full gap-2"
              size="lg"
            >
              <Play className="w-5 h-5" />
              {isCreating ? 'Creating Game...' : 'Start Game'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}