import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  format: string;
  status: string;
  max_participants: number | null;
  prize_pool: string | null;
  start_time: string | null;
  profiles: {
    username: string;
    display_name: string | null;
  };
  tournament_participants: Array<{ user_id: string }>;
}

export default function Tournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTournament, setNewTournament] = useState({
    name: "",
    description: "",
    format: "standard",
    max_participants: 16,
    prize_pool: "",
    start_time: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        profiles:organizer_id (username, display_name),
        tournament_participants (user_id)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading tournaments",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTournaments(data || []);
    }
    setLoading(false);
  };

  const handleCreateTournament = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('tournaments')
      .insert([{
        name: newTournament.name,
        description: newTournament.description,
        format: newTournament.format as 'standard' | 'chess960' | 'hand_and_brain' | 'puzzle_battle',
        max_participants: newTournament.max_participants,
        prize_pool: newTournament.prize_pool,
        start_time: newTournament.start_time,
        organizer_id: user.id,
        status: 'upcoming' as const,
      }]);

    if (error) {
      toast({
        title: "Error creating tournament",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Tournament created!" });
      setIsCreateOpen(false);
      setNewTournament({
        name: "",
        description: "",
        format: "standard",
        max_participants: 16,
        prize_pool: "",
        start_time: "",
      });
      fetchTournaments();
    }
  };

  const handleJoinTournament = async (tournamentId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('tournament_participants')
      .insert([{ tournament_id: tournamentId, user_id: user.id }]);

    if (error && error.code !== '23505') {
      toast({
        title: "Error joining tournament",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Joined tournament!" });
      fetchTournaments();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'upcoming': return 'secondary';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'standard': return 'Standard Chess';
      case 'chess960': return 'Chess960';
      case 'hand_and_brain': return 'Hand & Brain';
      case 'puzzle_battle': return 'Puzzle Battle';
      default: return format;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Tournaments</h1>
          <p className="text-muted-foreground">Compete in custom tournaments with unique formats</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Tournament
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Tournament</DialogTitle>
              <DialogDescription>Set up a new competitive event</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Tournament Name</Label>
                <Input
                  id="name"
                  value={newTournament.name}
                  onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                  placeholder="Spring Championship"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTournament.description}
                  onChange={(e) => setNewTournament({ ...newTournament, description: e.target.value })}
                  placeholder="Tournament details and rules..."
                />
              </div>
              <div>
                <Label htmlFor="format">Format</Label>
                <Select
                  value={newTournament.format}
                  onValueChange={(value) => setNewTournament({ ...newTournament, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Chess</SelectItem>
                    <SelectItem value="chess960">Chess960</SelectItem>
                    <SelectItem value="hand_and_brain">Hand & Brain</SelectItem>
                    <SelectItem value="puzzle_battle">Puzzle Battle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="max">Max Participants</Label>
                <Input
                  id="max"
                  type="number"
                  min="4"
                  max="128"
                  value={newTournament.max_participants}
                  onChange={(e) => setNewTournament({ ...newTournament, max_participants: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="prize">Prize Pool (Optional)</Label>
                <Input
                  id="prize"
                  value={newTournament.prize_pool}
                  onChange={(e) => setNewTournament({ ...newTournament, prize_pool: e.target.value })}
                  placeholder="$500, Trophies, etc."
                />
              </div>
              <div>
                <Label htmlFor="start">Start Time</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={newTournament.start_time}
                  onChange={(e) => setNewTournament({ ...newTournament, start_time: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateTournament} disabled={!newTournament.name}>
                Create Tournament
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((tournament) => (
          <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    {tournament.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    by {tournament.profiles.display_name || tournament.profiles.username}
                  </CardDescription>
                </div>
                <Badge variant={getStatusColor(tournament.status)}>
                  {tournament.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {tournament.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{tournament.description}</p>
              )}
              <div className="space-y-2">
                <Badge variant="outline">{getFormatLabel(tournament.format)}</Badge>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {tournament.tournament_participants.length}
                    {tournament.max_participants && ` / ${tournament.max_participants}`}
                  </span>
                  {tournament.start_time && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(tournament.start_time).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {tournament.prize_pool && (
                  <p className="text-sm font-medium text-primary">{tournament.prize_pool}</p>
                )}
              </div>
              <Button
                className="w-full mt-4"
                onClick={() => handleJoinTournament(tournament.id)}
                disabled={tournament.status === 'completed'}
              >
                {tournament.status === 'completed' ? 'Completed' : 'Join Tournament'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {tournaments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No tournaments available</p>
          <Button onClick={() => setIsCreateOpen(true)}>Create the first tournament</Button>
        </div>
      )}
    </div>
  );
}
