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
import { Users, UserPlus, Check, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export const FriendsDialog = ({ userId }: FriendsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [searchUsername, setSearchUsername] = useState("");

  useEffect(() => {
    if (open) {
      fetchFriends();
    }
  }, [open]);

  const fetchFriends = async () => {
    // Fetch accepted friends
    const { data: friendsData } = await supabase
      .from("friends")
      .select(
        `
        id,
        user_id,
        friend_id,
        status,
        profiles:friend_id (
          username,
          display_name,
          avatar_url
        )
      `
      )
      .eq("user_id", userId)
      .eq("status", "accepted");

    // Fetch pending requests (received)
    const { data: requestsData } = await supabase
      .from("friends")
      .select(
        `
        id,
        user_id,
        friend_id,
        status,
        profiles:user_id (
          username,
          display_name,
          avatar_url
        )
      `
      )
      .eq("friend_id", userId)
      .eq("status", "pending");

    setFriends((friendsData as any) || []);
    setRequests((requestsData as any) || []);
  };

  const sendFriendRequest = async () => {
    if (!searchUsername.trim()) {
      toast.error("Please enter a username");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", searchUsername.trim())
      .single();

    if (!profile) {
      toast.error("User not found");
      return;
    }

    if (profile.id === userId) {
      toast.error("You cannot add yourself as a friend");
      return;
    }

    const { error } = await supabase.from("friends").insert({
      user_id: userId,
      friend_id: profile.id,
      status: "pending",
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Friend request already sent");
      } else {
        toast.error("Failed to send friend request");
      }
    } else {
      toast.success("Friend request sent!");
      setSearchUsername("");
    }
  };

  const acceptRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("friends")
      .update({ status: "accepted" })
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to accept request");
    } else {
      toast.success("Friend request accepted!");
      fetchFriends();
    }
  };

  const rejectRequest = async (requestId: string) => {
    const { error } = await supabase.from("friends").delete().eq("id", requestId);

    if (error) {
      toast.error("Failed to reject request");
    } else {
      toast.success("Friend request rejected");
      fetchFriends();
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
                onKeyDown={(e) => e.key === "Enter" && sendFriendRequest()}
              />
              <Button onClick={sendFriendRequest} size="icon">
                <UserPlus className="w-4 h-4" />
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
                      >
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => rejectRequest(request.id)}
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
