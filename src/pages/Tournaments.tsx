import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, Calendar, Plus, UserPlus, Search, Home } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  is_participant?: boolean;
}

export default function Tournaments() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showLiveIndicator, setShowLiveIndicator] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
        () => {
          setShowLiveIndicator(true);
          fetchTournaments();
          setTimeout(() => setShowLiveIndicator(false), 3000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_participants'
        },
        () => {
          setShowLiveIndicator(true);
          fetchTournaments();
          setTimeout(() => setShowLiveIndicator(false), 3000);
        }
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

      const tournamentsWithCounts = await Promise.all(
        (tournamentsData || []).map(async (t) => {
          // Check if current user is a participant
          const { data: participation } = await supabase
            .from('tournament_participants')
            .select('id')
            .eq('tournament_id', t.id)
            .eq('user_id', user?.id)
            .maybeSingle();

          return {
            ...t,
            participant_count: t.tournament_participants?.[0]?.count || 0,
            is_participant: !!participation
          };
        })
      );

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

  const handleQuickJoin = async (tournamentId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    
    if (!user) {
      toast.error("Please sign in to join tournaments");
      navigate("/auth");
      return;
    }

    try {
      const { error } = await supabase.from('tournament_participants').insert({
        tournament_id: tournamentId,
        user_id: user.id,
        status: 'registered'
      });

      if (error) throw error;
      toast.success("Joined tournament successfully!");
      fetchTournaments();
    } catch (error: any) {
      toast.error(error.message || "Failed to join tournament");
    }
  };

  const filteredTournaments = tournaments.filter(t => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} title="Home">
              <Home className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Tournaments</h1>
              <p className="text-muted-foreground">Compete against players worldwide</p>
            </div>
            {showLiveIndicator && (
              <Badge variant="secondary" className="animate-pulse bg-green-500/20 text-green-600 border-green-500/30">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                Live
              </Badge>
            )}
          </div>
          <Button onClick={() => setShowCreateDialog(true)} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Create Tournament
          </Button>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tournaments by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={filterStatus} onValueChange={setFilterStatus}>
            <TabsList>
              <TabsTrigger value="all">All Tournaments</TabsTrigger>
              <TabsTrigger value="upcoming">
                Upcoming
                <Badge variant="secondary" className="ml-2">
                  {tournaments.filter(t => t.status === 'upcoming').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {filteredTournaments.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              {filterStatus === 'all' ? 'No tournaments yet' : `No ${filterStatus} tournaments`}
            </h3>
            <p className="text-muted-foreground mb-4">
              {filterStatus === 'upcoming' 
                ? 'No upcoming tournaments at the moment. Create one to get started!'
                : filterStatus === 'all'
                ? 'Be the first to create a tournament!'
                : 'Check back later for more tournaments.'}
            </p>
            {filterStatus === 'all' && (
              <Button onClick={() => setShowCreateDialog(true)}>
                Create Tournament
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => {
              const isFull = (tournament.participant_count || 0) >= tournament.max_participants;
              const canJoin = tournament.status === 'upcoming' && !tournament.is_participant && !isFull;

              return (
                <Card
                  key={tournament.id}
                  className="p-6 hover:shadow-lg transition-shadow relative"
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => navigate(`/tournaments/${tournament.id}`)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-foreground pr-2">{tournament.name}</h3>
                      <Badge className={getStatusColor(tournament.status)}>
                        {tournament.status}
                      </Badge>
                    </div>

                    {tournament.description && (
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {tournament.description}
                      </p>
                    )}

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center text-muted-foreground">
                        <Users className="w-4 h-4 mr-2" />
                        <span>
                          {tournament.participant_count || 0} / {tournament.max_participants} players
                          {isFull && <span className="ml-2 text-destructive font-medium">(Full)</span>}
                        </span>
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
                  </div>

                  {tournament.is_participant && (
                    <Badge variant="secondary" className="mb-3">
                      ✓ You're registered
                    </Badge>
                  )}

                  {canJoin && (
                    <Button 
                      onClick={(e) => handleQuickJoin(tournament.id, e)}
                      className="w-full"
                      size="sm"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Join Tournament
                    </Button>
                  )}

                  {isFull && tournament.status === 'upcoming' && !tournament.is_participant && (
                    <Button variant="outline" disabled className="w-full" size="sm">
                      Tournament Full
                    </Button>
                  )}
                </Card>
              );
            })}
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