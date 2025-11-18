import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Clock, ArrowLeft } from "lucide-react";
import { FriendsDialog } from "@/components/FriendsDialog";
import { NotificationBell } from "@/components/NotificationBell";
import { toast } from "sonner";

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


  const fetchRooms = async () => {
    const { data } = await supabase
      .from("rooms")
      .select(`id, name, creator_id, time_control, time_increment, member_count, game_status, profiles!rooms_creator_id_fkey(username)`)
      .eq("game_status", "waiting")
      .order("created_at", { ascending: false });

    setRooms(data || []);
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
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <Button variant="secondary" size="sm" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Button>
          <h1 className="text-2xl sm:text-4xl font-bold">Game Lobby</h1>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <FriendsDialog userId={user.id} />
          </div>
        </div>



        <div className="grid gap-3 sm:gap-4">
          {rooms.length === 0 ? (
            <Card className="gradient-card p-8 sm:p-12 text-center">
              <Users className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
              <h3 className="text-lg sm:text-xl font-bold mb-2">No games available</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">Be the first to create a game!</p>
            </Card>
          ) : (
            rooms.map((room) => (
              <Card key={room.id} className="gradient-card p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex-1 w-full">
                    <h3 className="text-lg sm:text-xl font-bold mb-2">Game Room</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                        Host: {room.profiles?.username || "Unknown"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                        {room.time_control}+{room.time_increment}
                      </span>
                    </div>
                  </div>
                  <Button onClick={() => joinRoom(room.id)} size="sm" className="w-full sm:w-auto">
                    Join Game
                  </Button>
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
