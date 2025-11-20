import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
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

  useEffect(() => {
    if (open) {
      fetchFriends();
    }
  }, [open]);

  const fetchFriends = async () => {
    // Fetch accepted friends
    const { data: friendsData, error: friendsError } = await supabase
      .from("friends")
      .select('id, user_id, friend_id, status')
      .eq("user_id", userId)
      .eq("status", "accepted");

    if (friendsError) {
      console.error('Error fetching friends:', friendsError);
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

    // Fetch profiles separately
    const friendIds = [...(friendsData || []).map(f => f.friend_id), ...(requestsData || []).map(r => r.user_id)];
    
    if (friendIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', friendIds);

      // Combine friends with profiles
      const friendsWithProfiles = (friendsData || []).map(friend => ({
        ...friend,
        profiles: profilesData?.find(p => p.id === friend.friend_id) || {}
      }));

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="w-4 h-4" />
          Friends ({friends.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Friends</DialogTitle>
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
                    <Avatar>
                      <AvatarImage src={friend.profiles.avatar_url || undefined} />
                      <AvatarFallback>
                        {friend.profiles.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {friend.profiles.display_name || friend.profiles.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{friend.profiles.username}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFriend(friend.id)}
                    >
                      Remove
                    </Button>
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
