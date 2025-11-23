import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CommunityBar } from '@/components/CommunityBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserPlus, Users, Search, Check, Clock, X, Ban, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { PuzzleChallengeDialog } from '@/components/PuzzleChallengeDialog';
import { TrainingStats } from '@/components/training/TrainingStats';

interface PlayerProfile {
  id: string;
  username: string;
  display_name: string | null;
  rating: number | null;
  bullet_rating: number | null;
  blitz_rating: number | null;
  rapid_rating: number | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  show_training_stats: boolean | null;
  total_games?: number;
  puzzles_solved?: number;
  chessmates_count?: number;
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
  const [pendingRequests, setPendingRequests] = useState<{ sent: PlayerProfile[], received: PlayerProfile[] }>({ sent: [], received: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [puzzleDialogOpen, setPuzzleDialogOpen] = useState(false);
  const [pendingFriendRequest, setPendingFriendRequest] = useState<{ id: string; name: string } | null>(null);
  const [sortBy, setSortBy] = useState<'rating' | 'games' | 'puzzles' | 'chessmates'>('rating');

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

      // Fetch additional stats for each player
      const enrichedProfiles = await Promise.all(
        (profilesData || []).map(async (profile) => {
          // Get games played
          const { data: statsData } = await supabase
            .from('player_stats')
            .select('total_games')
            .eq('user_id', profile.id)
            .maybeSingle();

          // Get puzzles solved
          const { data: trainingData } = await supabase
            .from('user_training_stats')
            .select('total_puzzles_solved')
            .eq('user_id', profile.id)
            .maybeSingle();

          // Get chessmates count
          const { count: chessmatesCount } = await supabase
            .from('friends')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'accepted')
            .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`);

          return {
            ...profile,
            total_games: statsData?.total_games || 0,
            puzzles_solved: trainingData?.total_puzzles_solved || 0,
            chessmates_count: chessmatesCount || 0
          };
        })
      );

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

      setPlayers(enrichedProfiles);
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

      // Load pending requests (sent and received)
      const sentRequestIds = Object.entries(statusMap)
        .filter(([_, status]) => status.isPending && status.isRequester)
        .map(([userId, _]) => userId);
      
      const receivedRequestIds = Object.entries(statusMap)
        .filter(([_, status]) => status.isPending && !status.isRequester)
        .map(([userId, _]) => userId);

      const sentProfiles: PlayerProfile[] = [];
      const receivedProfiles: PlayerProfile[] = [];

      if (sentRequestIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .in('id', sentRequestIds);
        if (!error && data) sentProfiles.push(...data);
      }

      if (receivedRequestIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .in('id', receivedRequestIds);
        if (!error && data) receivedProfiles.push(...data);
      }

      setPendingRequests({ sent: sentProfiles, received: receivedProfiles });
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

  const removeFriend = async (friendshipId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success('ChessMate removed');
      loadPlayers(user.id);
    } catch (error: any) {
      console.error('Error removing friend:', error);
      toast.error('Failed to remove ChessMate');
    }
  };

  const filteredPlayers = players
    .filter(player => 
      player.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'games':
          return (b.total_games || 0) - (a.total_games || 0);
        case 'puzzles':
          return (b.puzzles_solved || 0) - (a.puzzles_solved || 0);
        case 'chessmates':
          return (b.chessmates_count || 0) - (a.chessmates_count || 0);
        case 'rating':
        default:
          return (b.rating || 1200) - (a.rating || 1200);
      }
    });

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
      
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-3 md:mb-4">
            <Users className="w-7 h-7 md:w-8 md:h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">Networking Zone</h1>
          </div>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
            Discover chess players from around the world and build your network
          </p>
        </div>

        {/* Pending Requests Section */}
        {(pendingRequests.received.length > 0 || pendingRequests.sent.length > 0) && (
          <Card className="gradient-card mb-6 md:mb-8 border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                ChessMate Requests
              </CardTitle>
              <CardDescription className="text-sm">
                Manage your pending connection requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              {/* Received Requests */}
              {pendingRequests.received.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {pendingRequests.received.length}
                    </Badge>
                    Received Requests
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {pendingRequests.received.map((player) => {
                      const status = friendStatuses[player.id];
                      return (
                        <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                          <Avatar className="w-10 h-10 border-2 border-orange-500/20 shrink-0">
                            <AvatarImage src={player.avatar_url || undefined} />
                            <AvatarFallback className="bg-orange-500/10 text-orange-600 font-semibold">
                              {player.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {player.display_name || player.username}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">@{player.username}</p>
                            <div className="flex gap-1 mt-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs px-2"
                                onClick={() => acceptFriendRequest(status.friendshipId!)}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2"
                                onClick={() => declineFriendRequest(status.friendshipId!)}
                              >
                                <X className="w-3 h-3 mr-1" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sent Requests */}
              {pendingRequests.sent.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {pendingRequests.sent.length}
                    </Badge>
                    Sent Requests
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {pendingRequests.sent.map((player) => {
                      const status = friendStatuses[player.id];
                      return (
                        <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                          <Avatar className="w-10 h-10 border-2 border-primary/20 shrink-0">
                            <AvatarImage src={player.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {player.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {player.display_name || player.username}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">@{player.username}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2 mt-2"
                              onClick={() => cancelFriendRequest(status.friendshipId!)}
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Connected Friends Section */}
        {connectedFriends.length > 0 && (
          <Card className="gradient-card mb-6 md:mb-8 border-primary/20">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    My ChessMates
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Your chess network of {connectedFriends.length} connected {connectedFriends.length === 1 ? 'player' : 'players'}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-sm font-semibold w-fit">
                  {connectedFriends.length} Connected
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {connectedFriends.map((friend) => {
                  const status = friendStatuses[friend.id];
                  return (
                    <div
                      key={friend.id}
                      className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30 border border-primary/20"
                    >
                      <div 
                        className="flex items-center gap-3 cursor-pointer"
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
                          <Badge variant="outline" className="text-xs mt-1">
                            {friend.rating || 1200}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => removeFriend(status.friendshipId!)}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Disconnect
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Sort Bar */}
        <Card className="gradient-card mb-6 md:mb-8">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
                <Input
                  type="text"
                  placeholder="Search players by username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 md:pl-10 text-sm md:text-base h-9 md:h-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 md:px-4 py-2 rounded-md bg-background border border-input text-foreground text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
                >
                  <option value="rating">Sort by Rating</option>
                  <option value="games">Sort by Games Played</option>
                  <option value="puzzles">Sort by Puzzles Solved</option>
                  <option value="chessmates">Sort by ChessMates</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Players Grid */}
        {loading ? (
          <div className="text-center py-8 md:py-12">
            <p className="text-sm md:text-base text-muted-foreground">Loading players...</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <Card className="gradient-card">
            <CardContent className="p-8 md:p-12 text-center">
              <Users className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mx-auto mb-3 md:mb-4" />
              <p className="text-sm md:text-base text-muted-foreground">No players found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                  <CardHeader className="p-4 md:p-6">
                    <div className="flex items-start gap-3 md:gap-4">
                      <Avatar className="w-12 h-12 md:w-16 md:h-16 shrink-0">
                        <AvatarImage src={player.avatar_url || undefined} />
                        <AvatarFallback>
                          {player.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base md:text-lg truncate">
                          {player.display_name || player.username}
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm truncate">
                          @{player.username}
                        </CardDescription>
                        
                        {/* Category Ratings */}
                        <div className="flex flex-wrap gap-1 md:gap-1.5 mt-2">
                          <Badge variant="secondary" className="text-xs px-1.5 md:px-2 py-0.5">
                            <span className="text-muted-foreground mr-0.5 md:mr-1">Bullet:</span>
                            {player.bullet_rating || 1200}
                          </Badge>
                          <Badge variant="secondary" className="text-xs px-1.5 md:px-2 py-0.5">
                            <span className="text-muted-foreground mr-0.5 md:mr-1">Blitz:</span>
                            {player.blitz_rating || 1200}
                          </Badge>
                          <Badge variant="secondary" className="text-xs px-1.5 md:px-2 py-0.5">
                            <span className="text-muted-foreground mr-0.5 md:mr-1">Rapid:</span>
                            {player.rapid_rating || 1200}
                          </Badge>
                        </div>
                        {player.country && (
                          <Badge variant="outline" className="text-xs mt-1.5 md:mt-2">
                            {player.country}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 md:p-6 pt-0">
                    {player.bio && (
                      <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 line-clamp-2">
                        {player.bio}
                      </p>
                    )}

                    {/* Player Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-3 md:mb-4 p-2 md:p-3 bg-muted/30 rounded-lg">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Games</p>
                        <p className="text-sm font-bold text-foreground">{player.total_games || 0}</p>
                      </div>
                      <div className="text-center border-x border-border/50">
                        <p className="text-xs text-muted-foreground mb-1">Puzzles</p>
                        <p className="text-sm font-bold text-foreground">{player.puzzles_solved || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">ChessMates</p>
                        <p className="text-sm font-bold text-foreground">{player.chessmates_count || 0}</p>
                      </div>
                    </div>

                    {player.show_training_stats && (
                      <div className="mb-3 md:mb-4">
                        <TrainingStats userId={player.id} />
                      </div>
                    )}

                    <div className="flex gap-2">
                      {status.isBlocked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-9"
                          onClick={() => unblockUser(player.id)}
                        >
                          <Ban className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                          <span className="text-xs md:text-sm">Unblock</span>
                        </Button>
                      ) : status.isFriend ? (
                        <>
                          <Button variant="outline" size="sm" className="flex-1 h-9" disabled>
                            <Check className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                            <span className="text-xs md:text-sm">ChessMates</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-9 px-3"
                            onClick={() => blockUser(player.id)}
                            title="Block user"
                          >
                            <Ban className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </Button>
                        </>
                      ) : status.isPending && status.isRequester ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-9"
                            onClick={() => cancelFriendRequest(status.friendshipId!)}
                          >
                            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                            <span className="text-xs md:text-sm">Cancel</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-9 px-3"
                            onClick={() => blockUser(player.id)}
                            title="Block user"
                          >
                            <Ban className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </Button>
                        </>
                      ) : status.isPending && !status.isRequester ? (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 h-9"
                            onClick={() => acceptFriendRequest(status.friendshipId!)}
                          >
                            <Check className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                            <span className="text-xs md:text-sm">Accept</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-9"
                            onClick={() => declineFriendRequest(status.friendshipId!)}
                          >
                            <X className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                            <span className="text-xs md:text-sm">Decline</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-9 px-3"
                            onClick={() => blockUser(player.id)}
                            title="Block user"
                          >
                            <Ban className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 h-9"
                            onClick={() => initiateFriendRequest(player.id, player.display_name || player.username)}
                          >
                            <UserPlus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                            <span className="text-xs md:text-sm">Add ChessMate</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-9 px-3"
                            onClick={() => blockUser(player.id)}
                            title="Block user"
                          >
                            <Ban className="w-3.5 h-3.5 md:w-4 md:h-4" />
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
