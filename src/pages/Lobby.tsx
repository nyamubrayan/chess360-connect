import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, Clock, ArrowLeft, Share2, Zap } from "lucide-react";
import { FriendsDialog } from "@/components/FriendsDialog";
import { ShareGameLink } from "@/components/ShareGameLink";
import { NotificationBell } from "@/components/NotificationBell";
import { MatchmakingQueue } from "@/components/MatchmakingQueue";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Room {
  id: string;
  name: string;
  creator_id: string;
  time_control: number;
  time_increment: number;
  member_count: number;
  game_status: string;
  profiles: {
    username: string;
  };
}

const Lobby = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [timeControl, setTimeControl] = useState("10");
  const [timeIncrement, setTimeIncrement] = useState("0");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string>("");
  const [friends, setFriends] = useState<any[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharedRoomId, setSharedRoomId] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [quickMatchTime, setQuickMatchTime] = useState(10);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    fetchRooms();

    const channel = supabase
      .channel("lobby-rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => fetchRooms())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("friends")
      .select(`friend_id, profiles!friends_friend_id_fkey (id, username, display_name)`)
      .eq("user_id", user.id)
      .eq("status", "accepted");

    setFriends(data || []);
  };

  const fetchRooms = async () => {
    const { data } = await supabase
      .from("rooms")
      .select(`id, name, creator_id, time_control, time_increment, member_count, game_status, profiles!rooms_creator_id_fkey(username)`)
      .eq("game_status", "waiting")
      .order("created_at", { ascending: false });

    setRooms(data || []);
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to create a room");
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase.from("rooms").insert({
      name: roomName || `${user.email}'s Game`,
      white_player_id: user.id,
      time_control: parseInt(timeControl),
      time_increment: parseInt(timeIncrement),
      white_time_remaining: parseInt(timeControl) * 60,
      black_time_remaining: parseInt(timeControl) * 60,
      is_private: isPrivate,
      type: 'study',
    } as any).select().single();

    if (error) {
      toast.error("Failed to create room");
      return;
    }

      await supabase.from("room_members").insert({ room_id: data.id, user_id: user.id });
      
      // Send notifications to friends if it's a private game
      if (isPrivate && selectedFriend) {
        await supabase.from("notifications").insert({
          user_id: selectedFriend,
          type: "game_invite",
          title: "Chess Game Invitation",
          message: `${user.email?.split('@')[0] || 'A player'} has invited you to play chess!`,
          room_id: data.id,
          sender_id: user.id,
        });
      } else if (!isPrivate) {
        // Broadcast to all friends for public games
        const { data: friendsList } = await supabase
          .from("friends")
          .select("friend_id")
          .eq("user_id", user.id)
          .eq("status", "accepted");

        if (friendsList && friendsList.length > 0) {
          const notifications = friendsList.map((f) => ({
            user_id: f.friend_id,
            type: "game_invite",
            title: "New Game Available",
            message: `${user.email?.split('@')[0] || 'A player'} created a new chess game!`,
            room_id: data.id,
            sender_id: user.id,
          }));

          await supabase.from("notifications").insert(notifications);
        }
      }
      
      if (isPrivate) {
      setSharedRoomId(data.id);
      setShareDialogOpen(true);
      toast.success("Room created! Share the link with your friend");
    } else {
      toast.success("Room created!");
      navigate(`/play/${data.id}`);
    }
    
    setIsCreateDialogOpen(false);
  };

  const joinRoom = async (roomId: string) => {
    if (!user) {
      toast.error("Please sign in to join a room");
      navigate("/auth");
      return;
    }

    const { data: existingMember } = await supabase
      .from("room_members")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!existingMember) {
      await supabase.from("room_members").insert({ room_id: roomId, user_id: user.id });
    }

    navigate(`/play/${roomId}`);
  };

  const handleQuickMatch = async () => {
    if (!user) {
      toast.error("Please sign in to play");
      navigate("/auth");
      return;
    }

    try {
      setIsSearching(true);
      
      const { data, error } = await supabase.functions.invoke('match-players', {
        body: { 
          timeControl: quickMatchTime,
          userId: user.id 
        }
      });

      if (error) throw error;

      console.log('Match response:', data);

      if (data.matched) {
        toast.success(`Match found! You are ${data.color}`);
        navigate(`/play/${data.roomId}`);
      } else {
        toast.info('Searching for opponent...');
      }
    } catch (error) {
      console.error('Error starting quick match:', error);
      toast.error('Failed to start matchmaking');
      setIsSearching(false);
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

  if (isSearching) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Quick Match</h1>
            <NotificationBell userId={user.id} />
          </div>
          <MatchmakingQueue
            timeControl={quickMatchTime}
            userId={user.id}
            onCancel={() => setIsSearching(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="secondary" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Home
          </Button>
          <h1 className="text-4xl font-bold">Game Lobby</h1>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <FriendsDialog userId={user.id} />
          </div>
        </div>

        <Card className="gradient-card p-6 mb-6 glow-primary">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Quick Match
          </h2>
          <p className="text-muted-foreground mb-4">
            Get matched instantly with an opponent of similar skill
          </p>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="quick-time">Time Control (minutes)</Label>
              <Input
                id="quick-time"
                type="number"
                min="1"
                max="60"
                value={quickMatchTime}
                onChange={(e) => setQuickMatchTime(parseInt(e.target.value) || 10)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleQuickMatch} className="gap-2" size="lg">
              <Zap className="w-4 h-4" />
              Find Match
            </Button>
          </div>
        </Card>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 mb-6">
              <Plus className="w-4 h-4" />
              Create Game
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Game</DialogTitle>
              <DialogDescription>Set up a new game and wait for an opponent to join</DialogDescription>
            </DialogHeader>
            <form onSubmit={createRoom} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room Name</Label>
                <Input id="room-name" placeholder="My Chess Game" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time-control">Time Control (minutes)</Label>
                <Select value={timeControl} onValueChange={setTimeControl}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is-private"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded border-input"
                />
                <Label htmlFor="is-private" className="cursor-pointer">
                  Private game (share link with friend)
                </Label>
              </div>

              {isPrivate && friends.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="friend-select">Invite Friend (optional)</Label>
                  <Select value={selectedFriend} onValueChange={setSelectedFriend}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a friend to notify" />
                    </SelectTrigger>
                    <SelectContent>
                      {friends.map((friend: any) => (
                        <SelectItem key={friend.friend_id} value={friend.friend_id}>
                          {friend.profiles?.username || friend.profiles?.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                {isPrivate ? "Create & Get Link" : "Create Game"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <div className="grid gap-4">
          {rooms.length === 0 ? (
            <Card className="gradient-card p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">No games available</h3>
              <p className="text-muted-foreground mb-4">Be the first to create a game!</p>
            </Card>
          ) : (
            rooms.map((room) => (
              <Card key={room.id} className="gradient-card p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">Game Room</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" />Host: {room.profiles?.username || "Unknown"}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{room.time_control}+{room.time_increment}</span>
                    </div>
                  </div>
                  <Button onClick={() => joinRoom(room.id)}>Join Game</Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <ShareGameLink 
        roomId={sharedRoomId} 
        open={shareDialogOpen} 
        onOpenChange={setShareDialogOpen} 
      />
    </div>
  );
};

export default Lobby;
