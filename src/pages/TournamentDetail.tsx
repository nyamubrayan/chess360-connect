import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, Users, Clock, Play, Timer, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { TournamentBracket } from "@/components/tournaments/TournamentBracket";
import { TournamentStandings } from "@/components/tournaments/TournamentStandings";
import { TournamentSchedule } from "@/components/tournaments/TournamentSchedule";
import { formatDistanceToNow } from "date-fns";

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (!user) navigate("/auth");
    });
  }, [navigate]);

  useEffect(() => {
    if (!tournament?.start_date || tournament.status !== 'upcoming') return;

    const updateCountdown = () => {
      const startTime = new Date(tournament.start_date).getTime();
      const now = Date.now();
      const diff = startTime - now;

      if (diff <= 0) {
        setTimeRemaining("Tournament starting soon!");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let timeString = "";
      if (days > 0) timeString += `${days}d `;
      if (hours > 0 || days > 0) timeString += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) timeString += `${minutes}m `;
      timeString += `${seconds}s`;

      setTimeRemaining(timeString);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [tournament]);

  useEffect(() => {
    if (!user || !id) return;
    fetchTournamentData();

    const channel = supabase
      .channel(`tournament-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_participants', filter: `tournament_id=eq.${id}` }, fetchTournamentData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches', filter: `tournament_id=eq.${id}` }, async () => {
        await fetchTournamentData();
        // Auto-progress tournament if all matches in current round are completed
        checkAndProgressTournament();
      })
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
        supabase.from('tournament_participants').select('*').eq('tournament_id', id),
        supabase.from('tournament_matches')
          .select('*')
          .eq('tournament_id', id)
          .order('round', { ascending: true })
          .order('match_number', { ascending: true }),
      ]);

      if (tournamentRes.error) throw tournamentRes.error;
      if (participantsRes.error) throw participantsRes.error;
      if (matchesRes.error) throw matchesRes.error;

      const participantsData = participantsRes.data || [];
      const matchesData = matchesRes.data || [];

      const userIds = new Set<string>();

      participantsData.forEach((p: any) => {
        if (p.user_id) userIds.add(p.user_id);
      });

      matchesData.forEach((m: any) => {
        if (m.player1_id) userIds.add(m.player1_id);
        if (m.player2_id) userIds.add(m.player2_id);
        if (m.winner_id) userIds.add(m.winner_id);
      });

      let profilesById: Record<string, any> = {};

      if (userIds.size > 0) {
        const profilesRes = await supabase
          .from('profiles')
          .select('id, username, display_name, rating')
          .in('id', Array.from(userIds));

        if (profilesRes.error) throw profilesRes.error;

        profilesById = (profilesRes.data || []).reduce((acc: any, profile: any) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, any>);
      }

      const participantsWithProfiles = participantsData.map((p: any) => ({
        ...p,
        profiles: p.user_id ? profilesById[p.user_id] || null : null,
      }));

      const matchesWithPlayers = matchesData.map((m: any) => ({
        ...m,
        player1: m.player1_id ? profilesById[m.player1_id] || null : null,
        player2: m.player2_id ? profilesById[m.player2_id] || null : null,
        winner: m.winner_id ? profilesById[m.winner_id] || null : null,
      }));

      setTournament(tournamentRes.data);
      setParticipants(participantsWithProfiles);
      setMatches(matchesWithPlayers);
      setIsParticipant(participantsData.some((p: any) => p.user_id === user?.id) || false);
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

  const checkAndProgressTournament = async () => {
    if (!tournament || tournament.status !== 'active') return;

    // Check if all matches in current round are completed
    const currentRoundMatches = matches.filter(m => m.round === tournament.current_round);
    const allCompleted = currentRoundMatches.every(m => m.status === 'completed');

    if (allCompleted && currentRoundMatches.length > 0) {
      // Silently trigger progression
      try {
        await supabase.functions.invoke('manage-tournament', {
          body: { tournamentId: id, action: 'progress' }
        });
      } catch (error) {
        console.error('Failed to progress tournament:', error);
      }
    }
  };

  const handleCopyLink = async () => {
    const tournamentLink = `${window.location.origin}/tournaments/${id}`;
    try {
      await navigator.clipboard.writeText(tournamentLink);
      setLinkCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
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

  const formatTournamentFormat = (format: string) => {
    switch (format) {
      case 'single_elimination': return 'Single Elimination';
      case 'round_robin': return 'Round Robin';
      case 'swiss': return 'Swiss System';
      default: return format;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Button variant="ghost" onClick={() => navigate('/tournaments')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tournaments
        </Button>

        {tournament.status === 'upcoming' && tournament.start_date && (
          <Card className="p-6 mb-6 border-2 border-primary/50 bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Timer className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Tournament starts in</p>
                  <p className="text-3xl font-bold text-primary">{timeRemaining}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Start time</p>
                <p className="font-medium">{new Date(tournament.start_date).toLocaleString()}</p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
                <Badge className={tournament.status === 'active' ? 'bg-green-500' : tournament.status === 'completed' ? 'bg-gray-500' : 'bg-blue-500'}>
                  {tournament.status}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCopyLink} variant="outline" size="lg">
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </>
                  )}
                </Button>
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
            </div>
            {tournament.description && (
              <p className="text-muted-foreground mb-4">{tournament.description}</p>
            )}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">Share this tournament</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-background px-3 py-2 rounded border border-border truncate">
                  {window.location.origin}/tournaments/{id}
                </code>
                <Button onClick={handleCopyLink} size="sm" variant="ghost">
                  {linkCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
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
                <p className="text-2xl font-bold capitalize">{formatTournamentFormat(tournament.format)}</p>
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
          <Tabs defaultValue="bracket" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6">
              <TabsTrigger value="bracket">
                {tournament.format === 'single_elimination' ? 'Bracket' : 'Matches'}
              </TabsTrigger>
              <TabsTrigger value="standings">Standings</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>

            <TabsContent value="bracket">
              {tournament.format === 'single_elimination' ? (
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-6">Tournament Bracket</h2>
                  <TournamentBracket matches={matches} tournament={tournament} />
                </Card>
              ) : (
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-6">All Matches</h2>
                  <div className="space-y-4">
                    {matches.map((match: any) => (
                      <div key={match.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">
                            {match.player1?.display_name || match.player1?.username || "TBD"}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground mx-4">vs</span>
                        <div className="flex-1 text-right">
                          <p className="font-medium">
                            {match.player2?.display_name || match.player2?.username || "TBD"}
                          </p>
                        </div>
                        <div className="ml-4 min-w-[120px]">
                          {match.status === 'completed' && match.winner && (
                            <Badge className="bg-green-500">
                              {match.winner.display_name || match.winner.username} won
                            </Badge>
                          )}
                          {match.status === 'in_progress' && (
                            <Badge className="bg-blue-500">In Progress</Badge>
                          )}
                          {match.status === 'ready' && (
                            <Badge variant="outline">Ready</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="standings">
              <TournamentStandings 
                participants={participants} 
                matches={matches}
                format={tournament.format}
              />
            </TabsContent>

            <TabsContent value="schedule">
              <TournamentSchedule tournament={tournament} matches={matches} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}