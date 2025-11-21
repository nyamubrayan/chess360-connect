import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Plus } from "lucide-react";
import { CreateTournamentDialog } from "@/components/tournaments/CreateTournamentDialog";
import { toast } from "sonner";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  format: string;
  status: string;
  max_participants: number;
  start_date: string | null;
  time_control: number;
  created_at: string;
  participant_count?: number;
}

export default function Tournaments() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (!user) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    fetchTournaments();

    const channel = supabase
      .channel('tournament-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments'
        },
        () => fetchTournaments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchTournaments = async () => {
    try {
      const { data: tournamentsData, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_participants(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tournamentsWithCounts = tournamentsData?.map(t => ({
        ...t,
        participant_count: t.tournament_participants?.[0]?.count || 0
      })) || [];

      setTournaments(tournamentsWithCounts);
    } catch (error: any) {
      toast.error("Failed to load tournaments");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500';
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimeControl = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const formatTournamentFormat = (format: string) => {
    switch (format) {
      case 'single_elimination': return 'Single Elimination';
      case 'round_robin': return 'Round Robin';
      case 'swiss': return 'Swiss System';
      default: return format;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Tournaments</h1>
            <p className="text-muted-foreground">Compete against players worldwide</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Create Tournament
          </Button>
        </div>

        {tournaments.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No tournaments yet</h3>
            <p className="text-muted-foreground mb-4">Be the first to create a tournament!</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              Create Tournament
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <Card
                key={tournament.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/tournaments/${tournament.id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-foreground">{tournament.name}</h3>
                  <Badge className={getStatusColor(tournament.status)}>
                    {tournament.status}
                  </Badge>
                </div>

                {tournament.description && (
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {tournament.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{tournament.participant_count || 0} / {tournament.max_participants} players</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Trophy className="w-4 h-4 mr-2" />
                    <span>{formatTimeControl(tournament.time_control)} • {formatTournamentFormat(tournament.format)}</span>
                  </div>
                  {tournament.start_date && (
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{new Date(tournament.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <CreateTournamentDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={fetchTournaments}
        />
      </div>
    </div>
  );
}