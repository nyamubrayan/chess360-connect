import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CommunityBar } from '@/components/CommunityBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserPlus, Users, Search, Check, Clock, X, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { PuzzleChallengeDialog } from '@/components/PuzzleChallengeDialog';
import { TrainingStats } from '@/components/training/TrainingStats';

interface PlayerProfile {
  id: string;
  username: string;
  display_name: string | null;
  rating: number | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  show_training_stats: boolean | null;
}

interface FriendProfile {
  id: string;
  username: string;
  display_name: string | null;
  rating: number | null;
  avatar_url: string | null;
}

interface FriendStatus {
  isFriend: boolean;
  isPending: boolean;
  isRequester: boolean;
  friendshipId?: string;
  isBlocked: boolean;
  hasBlockedYou: boolean;
}

export default function Connect() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, FriendStatus>>({});
  const [connectedFriends, setConnectedFriends] = useState<FriendProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [puzzleDialogOpen, setPuzzleDialogOpen] = useState(false);
  const [pendingFriendRequest, setPendingFriendRequest] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
      loadPlayers(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadPlayers = async (currentUserId: string) => {
    try {
      setLoading(true);

      // Fetch blocked users
      const { data: blockedData, error: blockedError } = await supabase
        .from('blocked_users')
        .select('*')
        .or(`user_id.eq.${currentUserId},blocked_user_id.eq.${currentUserId}`);

      if (blockedError) throw blockedError;

      const blockedByMe = new Set(
        blockedData?.filter(b => b.user_id === currentUserId).map(b => b.blocked_user_id) || []
      );
      const blockedMe = new Set(
        blockedData?.filter(b => b.blocked_user_id === currentUserId).map(b => b.user_id) || []
      );

      // Fetch all profiles except current user and those who blocked you
      let profilesQuery = supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId);

      // Only filter blocked users if there are any
      if (blockedMe.size > 0) {
        profilesQuery = profilesQuery.not('id', 'in', `(${Array.from(blockedMe).join(',')})`);
      }

      const { data: profilesData, error: profilesError } = await profilesQuery
        .order('rating', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch friend statuses
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('*')
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

      if (friendsError) throw friendsError;

      // Build friend status map
      const statusMap: Record<string, FriendStatus> = {};
      friendsData?.forEach((friendship) => {
        const otherUserId = friendship.user_id === currentUserId 
          ? friendship.friend_id 
          : friendship.user_id;
        
        statusMap[otherUserId] = {
          isFriend: friendship.status === 'accepted',
          isPending: friendship.status === 'pending',
          isRequester: friendship.user_id === currentUserId,
          friendshipId: friendship.id,
          isBlocked: blockedByMe.has(otherUserId),
          hasBlockedYou: blockedMe.has(otherUserId)
        };
      });

      // Add blocked status for non-friends
      profilesData?.forEach(profile => {
        if (!statusMap[profile.id]) {
          statusMap[profile.id] = {
            isFriend: false,
            isPending: false,
            isRequester: false,
            isBlocked: blockedByMe.has(profile.id),
            hasBlockedYou: blockedMe.has(profile.id)
          };
        }
      });

      setPlayers(profilesData || []);
      setFriendStatuses(statusMap);

      // Load connected friends (accepted friendships)
      const acceptedFriendIds = Object.entries(statusMap)
        .filter(([_, status]) => status.isFriend)
        .map(([userId, _]) => userId);

      if (acceptedFriendIds.length > 0) {
        const { data: friendProfilesData, error: friendProfilesError } = await supabase
          .from('profiles')
          .select('id, username, display_name, rating, avatar_url')
          .in('id', acceptedFriendIds)
          .order('username', { ascending: true });

        if (friendProfilesError) throw friendProfilesError;
        setConnectedFriends(friendProfilesData || []);
      } else {
        setConnectedFriends([]);
      }
    } catch (error: any) {
      console.error('Error loading players:', error);
      toast.error('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const initiateFriendRequest = (friendId: string, friendName: string) => {
    setPendingFriendRequest({ id: friendId, name: friendName });
    setPuzzleDialogOpen(true);
  };

  const sendFriendRequest = async () => {
    if (!user || !pendingFriendRequest) return;

    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: pendingFriendRequest.id,
          status: 'pending'
        });

      if (error) throw error;

      // Send notification
      await supabase.from('notifications').insert({
        user_id: pendingFriendRequest.id,
        sender_id: user.id,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${user.email} wants to be your friend!`
      });

      toast.success('Friend request sent!');
      loadPlayers(user.id);
      setPendingFriendRequest(null);
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send friend request');
    }
  };

  const cancelFriendRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success('Friend request cancelled');
      loadPlayers(user!.id);
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast.error('Failed to cancel request');
    }
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success('Friend request accepted!');
      loadPlayers(user!.id);
    } catch (error: any) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    }
  };

  const declineFriendRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success('Friend request declined');
      loadPlayers(user!.id);
    } catch (error: any) {
      console.error('Error declining request:', error);
      toast.error('Failed to decline request');
    }
  };

  const blockUser = async (userId: string) => {
    if (!user) return;

    try {
      // Remove friendship if exists
      await supabase
        .from('friends')
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`);

      // Add to blocked users
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          user_id: user.id,
          blocked_user_id: userId
        });

      if (error) throw error;

      toast.success('User blocked');
      loadPlayers(user.id);
    } catch (error: any) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user');
    }
  };

  const unblockUser = async (userId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('user_id', user.id)
        .eq('blocked_user_id', userId);

      if (error) throw error;

      toast.success('User unblocked');
      loadPlayers(user.id);
    } catch (error: any) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user');
    }
  };

  const filteredPlayers = players.filter(player => 
    player.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="min-h-screen bg-background">
      <CommunityBar user={user} />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="text-4xl lg:text-5xl font-bold">Networking Zone</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Discover chess players from around the world and build your network
          </p>
        </div>

        {/* Connected Friends Section */}
        {connectedFriends.length > 0 && (
          <Card className="gradient-card mb-8 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  My ChessMates
                </CardTitle>
                <Badge variant="secondary" className="text-sm font-semibold">
                  {connectedFriends.length} Connected
                </Badge>
              </div>
              <CardDescription>
                Your chess network of {connectedFriends.length} connected {connectedFriends.length === 1 ? 'player' : 'players'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {connectedFriends.map((friend) => (
                  <button
                    key={friend.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 active:bg-muted/60 transition-all cursor-pointer text-left w-full touch-manipulation"
                    onClick={() => navigate(`/profile/${friend.id}`)}
                  >
                    <Avatar className="w-10 h-10 border-2 border-primary/20 shrink-0">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {friend.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="font-semibold text-sm truncate">
                        {friend.display_name || friend.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{friend.username}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1 pointer-events-none">
                        {friend.rating || 1200}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Bar */}
        <Card className="gradient-card mb-8">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Search players by username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Players Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading players...</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <Card className="gradient-card">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No players found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlayers.map((player) => {
              const status = friendStatuses[player.id] || {
                isFriend: false,
                isPending: false,
                isRequester: false,
                isBlocked: false,
                hasBlockedYou: false
              };

              return (
                <Card key={player.id} className="gradient-card hover:glow-primary transition-all">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={player.avatar_url || undefined} />
                        <AvatarFallback>
                          {player.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">
                          {player.display_name || player.username}
                        </CardTitle>
                        <CardDescription className="truncate">
                          @{player.username}
                        </CardDescription>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {player.rating || 1200} ELO
                          </Badge>
                          {player.country && (
                            <Badge variant="outline" className="text-xs">
                              {player.country}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {player.bio && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {player.bio}
                      </p>
                    )}

                    {player.show_training_stats && (
                      <div className="mb-4">
                        <TrainingStats userId={player.id} />
                      </div>
                    )}

                    <div className="flex gap-2">
                      {status.isBlocked ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => unblockUser(player.id)}
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Unblock
                        </Button>
                      ) : status.isFriend ? (
                        <>
                          <Button variant="outline" className="flex-1" disabled>
                            <Check className="w-4 h-4 mr-2" />
                            ChessMates
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => blockUser(player.id)}
                            title="Block user"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        </>
                      ) : status.isPending && status.isRequester ? (
                        <>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => cancelFriendRequest(status.friendshipId!)}
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Cancel Request
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => blockUser(player.id)}
                            title="Block user"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        </>
                      ) : status.isPending && !status.isRequester ? (
                        <>
                          <Button
                            variant="default"
                            className="flex-1"
                            onClick={() => acceptFriendRequest(status.friendshipId!)}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => declineFriendRequest(status.friendshipId!)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Decline
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => blockUser(player.id)}
                            title="Block user"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="default"
                            className="flex-1"
                            onClick={() => initiateFriendRequest(player.id, player.display_name || player.username)}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add ChessMate
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => blockUser(player.id)}
                            title="Block user"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <PuzzleChallengeDialog
        open={puzzleDialogOpen}
        onOpenChange={setPuzzleDialogOpen}
        onSuccess={sendFriendRequest}
        playerName={pendingFriendRequest?.name || ''}
      />
    </div>
  );
}
