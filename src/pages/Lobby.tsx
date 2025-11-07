import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, Clock, ArrowLeft } from "lucide-react";
import { FriendsDialog } from "@/components/FriendsDialog";
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
      .select(`id, creator_id, time_control, time_increment, member_count, game_status, profiles!rooms_creator_id_fkey(username)`)
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
      white_player_id: user.id,
      time_control: parseInt(timeControl),
      time_increment: parseInt(timeIncrement),
      white_time_remaining: parseInt(timeControl) * 60,
      black_time_remaining: parseInt(timeControl) * 60,
    } as any).select().single();

    if (error) {
      toast.error("Failed to create room");
      return;
    }

    await supabase.from("room_members").insert({ room_id: data.id, user_id: user.id });
    toast.success("Room created!");
    setIsCreateDialogOpen(false);
    navigate(`/play/${data.id}`);
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="secondary" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Home
          </Button>
          <h1 className="text-4xl font-bold">Game Lobby</h1>
          {user && <FriendsDialog userId={user.id} />}
        </div>

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
                <Input id="room-name" placeholder="My Chess Game" value={roomName} onChange={(e) => setRoomName(e.target.value)} required />
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
              <Button type="submit" className="w-full" size="lg"><Plus className="w-5 h-5 mr-2" />Create Game</Button>
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
    </div>
  );
};

export default Lobby;
