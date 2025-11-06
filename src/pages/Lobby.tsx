import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Clock, Users, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    fetchRooms();

    const channel = supabase
      .channel("lobby-rooms")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
        },
        () => fetchRooms()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select(`
        id,
        name,
        creator_id,
        time_control,
        time_increment,
        member_count,
        game_status,
        profiles!rooms_creator_id_fkey(username)
      `)
      .eq("game_status", "waiting")
      .eq("type", "study")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching rooms:", error);
      return;
    }

    setRooms(data || []);
  };

  const createRoom = async () => {
    if (!user) {
      toast.error("Please sign in to create a room");
      navigate("/auth");
      return;
    }

    if (!roomName.trim()) {
      toast.error("Please enter a room name");
      return;
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        name: roomName,
        creator_id: user.id,
        type: "study",
        time_control: parseInt(timeControl),
        time_increment: parseInt(timeIncrement),
        white_time_remaining: parseInt(timeControl) * 60,
        black_time_remaining: parseInt(timeControl) * 60,
        game_status: "waiting",
      })
      .select()
      .single();

    if (roomError) {
      console.error("Error creating room:", roomError);
      toast.error("Failed to create room");
      return;
    }

    // Join the room as a member
    const { error: memberError } = await supabase.from("room_members").insert({
      room_id: room.id,
      user_id: user.id,
    });

    if (memberError) {
      console.error("Error joining room:", memberError);
      toast.error("Failed to join room");
      return;
    }

    toast.success("Room created!");
    setIsCreateDialogOpen(false);
    navigate(`/play/${room.id}`);
  };

  const joinRoom = async (roomId: string) => {
    if (!user) {
      toast.error("Please sign in to join a room");
      navigate("/auth");
      return;
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("room_members")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!existingMember) {
      const { error } = await supabase.from("room_members").insert({
        room_id: roomId,
        user_id: user.id,
      });

      if (error) {
        console.error("Error joining room:", error);
        toast.error("Failed to join room");
        return;
      }
    }

    navigate(`/play/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="secondary" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Game Lobby</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Game
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Game</DialogTitle>
                <DialogDescription>
                  Set up a new game and wait for an opponent to join
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="room-name">Room Name</Label>
                  <Input
                    id="room-name"
                    placeholder="My Chess Game"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                </div>
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
                  <Select value={timeIncrement} onValueChange={setTimeIncrement}>
                    <SelectTrigger id="increment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No increment</SelectItem>
                      <SelectItem value="2">+2 seconds</SelectItem>
                      <SelectItem value="3">+3 seconds</SelectItem>
                      <SelectItem value="5">+5 seconds</SelectItem>
                      <SelectItem value="10">+10 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createRoom}>Create Game</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {rooms.length === 0 ? (
            <Card className="gradient-card p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">No games available</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to create a game!
              </p>
            </Card>
          ) : (
            rooms.map((room) => (
              <Card key={room.id} className="gradient-card p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{room.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Host: {room.profiles?.username || "Unknown"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {room.time_control}+{room.time_increment}
                      </span>
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
