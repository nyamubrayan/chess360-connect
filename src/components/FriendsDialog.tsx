import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, UserPlus, Check, X, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    rating: number | null;
  };
}

interface FriendsDialogProps {
  userId: string;
}

// Validation schema for username
const usernameSchema = z.string()
  .trim()
  .min(1, "Username is required")
  .max(50, "Username must be less than 50 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens");

export const FriendsDialog = ({ userId }: FriendsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [searchUsername, setSearchUsername] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [onlineFriends, setOnlineFriends] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      fetchFriends();
    }
  }, [open]);

  // Track online presence
  useEffect(() => {
    if (!open || !userId) return;

    const channel = supabase.channel('online-users');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineUserIds = new Set<string>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id) {
              onlineUserIds.add(presence.user_id);
            }
          });
        });
        
        setOnlineFriends(onlineUserIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, userId]);

  const fetchFriends = async () => {
    // Fetch friendships where user is the sender
    const { data: sentFriends, error: sentError } = await supabase
      .from("friends")
      .select('id, user_id, friend_id, status')
      .eq("user_id", userId)
      .eq("status", "accepted");

    if (sentError) {
      console.error('Error fetching sent friends:', sentError);
    }

    // Fetch friendships where user is the recipient
    const { data: receivedFriends, error: receivedError } = await supabase
      .from("friends")
      .select('id, user_id, friend_id, status')
      .eq("friend_id", userId)
      .eq("status", "accepted");

    if (receivedError) {
      console.error('Error fetching received friends:', receivedError);
    }

    // Fetch pending requests (received)
    const { data: requestsData, error: requestsError } = await supabase
      .from("friends")
      .select('id, user_id, friend_id, status')
      .eq("friend_id", userId)
      .eq("status", "pending");

    if (requestsError) {
      console.error('Error fetching requests:', requestsError);
    }

    // Combine both directions of friendships
    const allFriends = [...(sentFriends || []), ...(receivedFriends || [])];
    
    // Get the friend IDs (opposite side of the relationship for each)
    const friendIds = [
      ...(sentFriends || []).map(f => f.friend_id),
      ...(receivedFriends || []).map(f => f.user_id),
      ...(requestsData || []).map(r => r.user_id)
    ];
    
    if (friendIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, rating')
        .in('id', friendIds);

      // Map friends with profiles (adjust friend_id based on direction)
      const friendsWithProfiles = [
        ...(sentFriends || []).map(friend => ({
          ...friend,
          profiles: profilesData?.find(p => p.id === friend.friend_id) || {}
        })),
        ...(receivedFriends || []).map(friend => ({
          ...friend,
          friend_id: friend.user_id, // Swap so we always use friend_id for the other person
          profiles: profilesData?.find(p => p.id === friend.user_id) || {}
        }))
      ];

      const requestsWithProfiles = (requestsData || []).map(request => ({
        ...request,
        profiles: profilesData?.find(p => p.id === request.user_id) || {}
      }));

      setFriends(friendsWithProfiles as any);
      setRequests(requestsWithProfiles as any);
    } else {
      setFriends([]);
      setRequests([]);
    }
  };

  const sendFriendRequest = async () => {
    // Validate username input
    const validation = usernameSchema.safeParse(searchUsername);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSendingRequest(true);

    try {
      // Check if user exists
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", validation.data)
        .maybeSingle();

      if (profileError) {
        toast.error("Error searching for user");
        return;
      }

      if (!profile) {
        toast.error("User not found");
        return;
      }

      if (profile.id === userId) {
        toast.error("You cannot add yourself as a friend");
        return;
      }

      // Check if already friends or request exists
      const { data: existing } = await supabase
        .from("friends")
        .select("id, status")
        .or(`and(user_id.eq.${userId},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${userId})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === "accepted") {
          toast.error("You are already friends with this user");
        } else {
          toast.error("Friend request already exists");
        }
        return;
      }

      // Send friend request
      const { error } = await supabase.from("friends").insert({
        user_id: userId,
        friend_id: profile.id,
        status: "pending",
      });

      if (error) {
        console.error("Friend request error:", error);
        toast.error("Failed to send friend request");
      } else {
        // Send notification to the friend
        await supabase.from("notifications").insert({
          user_id: profile.id,
          sender_id: userId,
          type: "friend_request",
          title: "Friend Request",
          message: `You have a new friend request!`,
        });

        toast.success(`Friend request sent to @${profile.username}!`);
        setSearchUsername("");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setSendingRequest(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      const { error } = await supabase
        .from("friends")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) {
        console.error("Accept request error:", error);
        toast.error("Failed to accept request");
      } else {
        toast.success("Friend request accepted!");
        await fetchFriends();
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const rejectRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      const { error } = await supabase
        .from("friends")
        .delete()
        .eq("id", requestId);

      if (error) {
        console.error("Reject request error:", error);
        toast.error("Failed to reject request");
      } else {
        toast.success("Friend request declined");
        await fetchFriends();
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase.from("friends").delete().eq("id", friendshipId);

    if (error) {
      toast.error("Failed to remove friend");
    } else {
      toast.success("Friend removed");
      fetchFriends();
    }
  };

  const challengeFriend = async (friendId: string, friendUsername: string) => {
    try {
      // Create a private game for the friend
      const { data: newGame, error: gameError } = await supabase
        .from("games")
        .insert({
          white_player_id: userId,
          black_player_id: friendId,
          status: "waiting",
          time_control: 600,
          time_increment: 0,
          white_time_remaining: 600,
          black_time_remaining: 600,
        })
        .select()
        .single();

      if (gameError) {
        toast.error("Failed to create game challenge");
        return;
      }

      // Send notification to friend with game_id in room_id field
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: friendId,
          sender_id: userId,
          room_id: newGame.id, // Store game ID here
          type: "game_challenge",
          title: "Game Challenge!",
          message: `You've been challenged to a game!`,
        });

      if (notifError) {
        console.error("Failed to send notification:", notifError);
      }

      toast.success(`Challenge sent to ${friendUsername}!`);
      setOpen(false);
    } catch (error) {
      console.error("Challenge error:", error);
      toast.error("Failed to send challenge");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="w-4 h-4" />
          Friends
          <span className="text-muted-foreground">({friends.length})</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Friends</DialogTitle>
          <DialogDescription>
            Manage your friend list and friend requests
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends">
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({requests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add friend by username"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !sendingRequest && sendFriendRequest()}
                disabled={sendingRequest}
              />
              <Button 
                onClick={sendFriendRequest} 
                size="icon"
                disabled={sendingRequest}
              >
                {sendingRequest ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {friends.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No friends yet
                </p>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 p-3 rounded bg-muted/30"
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={friend.profiles.avatar_url || undefined} />
                        <AvatarFallback>
                          {friend.profiles.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {onlineFriends.has(friend.friend_id) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {friend.profiles.display_name || friend.profiles.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{friend.profiles.username} • {friend.profiles.rating || 1200} ELO
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => challengeFriend(friend.friend_id, friend.profiles.username)}
                      >
                        Challenge
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFriend(friend.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No pending requests
                </p>
              ) : (
                requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-3 p-3 rounded bg-muted/30"
                  >
                    <Avatar>
                      <AvatarImage src={request.profiles.avatar_url || undefined} />
                      <AvatarFallback>
                        {request.profiles.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {request.profiles.display_name || request.profiles.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{request.profiles.username}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => acceptRequest(request.id)}
                        disabled={processingRequestId === request.id}
                        title="Accept friend request"
                      >
                        {processingRequestId === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => rejectRequest(request.id)}
                        disabled={processingRequestId === request.id}
                        title="Decline friend request"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
