import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface StudyRoom {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  is_public: boolean;
  max_participants: number;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
  };
  study_room_participants: Array<{ user_id: string }>;
}

export default function StudyRooms() {
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: "",
    description: "",
    is_public: true,
    max_participants: 10,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchRooms();

    const channel = supabase
      .channel('study-rooms-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_rooms' }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('study_rooms')
      .select(`
        *,
        profiles:creator_id (username, display_name),
        study_room_participants (user_id)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading rooms",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setRooms(data || []);
    }
    setLoading(false);
  };

  const handleCreateRoom = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('study_rooms')
      .insert([{
        ...newRoom,
        creator_id: user.id,
      }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating room",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Study room created!" });
      setIsCreateOpen(false);
      setNewRoom({ name: "", description: "", is_public: true, max_participants: 10 });
      navigate(`/study-room/${data.id}`);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('study_room_participants')
      .insert([{ room_id: roomId, user_id: user.id }]);

    if (error && error.code !== '23505') { // Ignore duplicate entry error
      toast({
        title: "Error joining room",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate(`/study-room/${roomId}`);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading...</div>;
  }

  return (
    <>
      <div className="flex justify-end items-center mb-6">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Study Room</DialogTitle>
              <DialogDescription>Set up a new collaborative study space</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Room Name</Label>
                <Input
                  id="name"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  placeholder="Opening Theory Discussion"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                  placeholder="What will you study?"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="public">Public Room</Label>
                <Switch
                  id="public"
                  checked={newRoom.is_public}
                  onCheckedChange={(checked) => setNewRoom({ ...newRoom, is_public: checked })}
                />
              </div>
              <div>
                <Label htmlFor="max">Max Participants</Label>
                <Input
                  id="max"
                  type="number"
                  min="2"
                  max="50"
                  value={newRoom.max_participants}
                  onChange={(e) => setNewRoom({ ...newRoom, max_participants: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateRoom} disabled={!newRoom.name}>
                Create Room
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <Card key={room.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {room.name}
                    {!room.is_public && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    by {room.profiles.display_name || room.profiles.username}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {room.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{room.description}</p>
              )}
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {room.study_room_participants.length} / {room.max_participants}
                </Badge>
                <Button size="sm" onClick={() => handleJoinRoom(room.id)}>
                  Join Room
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rooms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No study rooms available</p>
          <Button onClick={() => setIsCreateOpen(true)}>Create the first room</Button>
        </div>
      )}
    </>
  );
}
