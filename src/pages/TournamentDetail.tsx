import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Users, Clock, Play } from "lucide-react";
import { toast } from "sonner";
import { TournamentBracket } from "@/components/tournaments/TournamentBracket";

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (!user) navigate("/auth");
    });
  }, [navigate]);

  useEffect(() => {
    if (!user || !id) return;
    fetchTournamentData();

    const channel = supabase
      .channel(`tournament-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_participants', filter: `tournament_id=eq.${id}` }, fetchTournamentData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches', filter: `tournament_id=eq.${id}` }, fetchTournamentData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` }, fetchTournamentData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, id]);

  const fetchTournamentData = async () => {
    try {
      const [tournamentRes, participantsRes, matchesRes] = await Promise.all([
        supabase.from('tournaments').select('*').eq('id', id).single(),
        supabase.from('tournament_participants').select(`
          *,
          profiles:user_id(username, display_name, rating)
        `).eq('tournament_id', id),
        supabase.from('tournament_matches').select(`
          *,
          player1:player1_id(username, display_name),
          player2:player2_id(username, display_name),
          winner:winner_id(username, display_name)
        `).eq('tournament_id', id).order('round', { ascending: true }).order('match_number', { ascending: true })
      ]);

      if (tournamentRes.error) throw tournamentRes.error;
      if (participantsRes.error) throw participantsRes.error;
      if (matchesRes.error) throw matchesRes.error;

      setTournament(tournamentRes.data);
      setParticipants(participantsRes.data || []);
      setMatches(matchesRes.data || []);
      setIsParticipant(participantsRes.data?.some(p => p.user_id === user?.id) || false);
    } catch (error: any) {
      toast.error("Failed to load tournament");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTournament = async () => {
    try {
      const { error } = await supabase.from('tournament_participants').insert({
        tournament_id: id,
        user_id: user.id,
        status: 'registered'
      });

      if (error) throw error;
      toast.success("Joined tournament successfully!");
      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || "Failed to join tournament");
    }
  };

  const handleStartTournament = async () => {
    try {
      const { error } = await supabase.functions.invoke('manage-tournament', {
        body: { tournamentId: id, action: 'start' }
      });

      if (error) throw error;
      toast.success("Tournament started!");
      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || "Failed to start tournament");
    }
  };

  if (loading || !tournament) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading tournament...</p>
        </div>
      </div>
    );
  }

  const canJoin = tournament.status === 'upcoming' && !isParticipant && participants.length < tournament.max_participants;
  const canStart = tournament.status === 'upcoming' && tournament.creator_id === user?.id && participants.length >= 2;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Button variant="ghost" onClick={() => navigate('/tournaments')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tournaments
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
                <Badge className={tournament.status === 'active' ? 'bg-green-500' : tournament.status === 'completed' ? 'bg-gray-500' : 'bg-blue-500'}>
                  {tournament.status}
                </Badge>
              </div>
              {canJoin && (
                <Button onClick={handleJoinTournament} size="lg">
                  Join Tournament
                </Button>
              )}
              {canStart && (
                <Button onClick={handleStartTournament} size="lg">
                  <Play className="w-4 h-4 mr-2" />
                  Start Tournament
                </Button>
              )}
            </div>
            {tournament.description && (
              <p className="text-muted-foreground mb-4">{tournament.description}</p>
            )}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{participants.length}/{tournament.max_participants}</p>
                <p className="text-sm text-muted-foreground">Players</p>
              </div>
              <div>
                <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{tournament.time_control / 60} min</p>
                <p className="text-sm text-muted-foreground">Time Control</p>
              </div>
              <div>
                <Trophy className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold capitalize">{tournament.format.replace('_', ' ')}</p>
                <p className="text-sm text-muted-foreground">Format</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Participants</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {participants.map((participant, index) => (
                <div key={participant.id} className="flex items-center justify-between p-2 rounded bg-accent/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                    <div>
                      <p className="font-medium">{participant.profiles?.display_name || participant.profiles?.username}</p>
                      <p className="text-xs text-muted-foreground">Rating: {participant.profiles?.rating || 1200}</p>
                    </div>
                  </div>
                  {participant.status === 'eliminated' && (
                    <Badge variant="outline" className="text-xs">Eliminated</Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {(tournament.status === 'active' || tournament.status === 'completed') && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Tournament Bracket</h2>
            <TournamentBracket matches={matches} tournament={tournament} />
          </Card>
        )}
      </div>
    </div>
  );
}