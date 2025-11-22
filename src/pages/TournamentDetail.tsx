import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Trophy, Users, Clock, Play, Timer, UserPlus, Home } from "lucide-react";
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
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (!user) navigate("/auth");
    });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    fetchFriends();
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (error || !data) return;

    const friendIds = data.map((f: any) => f.friend_id);
    
    if (friendIds.length === 0) {
      setFriends([]);
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, rating')
      .in('id', friendIds);

    if (!profilesError && profilesData) {
      setFriends(profilesData);
    }
  };

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

  const handleInviteFriends = async (selectedFriendIds: string[]) => {
    if (!user || !tournament) return;
    
    setSendingInvites(true);
    try {
      const invitePromises = selectedFriendIds.map(async (friendId) => {
        return supabase.from('notifications').insert({
          user_id: friendId,
          sender_id: user.id,
          type: 'tournament_invite',
          title: 'Tournament Invitation',
          message: `${user.user_metadata?.display_name || user.user_metadata?.username || 'Someone'} invited you to join "${tournament.name}"`,
          room_id: tournament.id
        });
      });

      await Promise.all(invitePromises);
      toast.success(`Sent ${selectedFriendIds.length} invite${selectedFriendIds.length > 1 ? 's' : ''}!`);
      setInviteDialogOpen(false);
    } catch (error: any) {
      toast.error("Failed to send invites");
      console.error(error);
    } finally {
      setSendingInvites(false);
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
    <div className="min-h-screen bg-background pb-20 sm:pb-8">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <Button variant="ghost" onClick={() => navigate('/')} size="icon" title="Home" className="-ml-2 sm:ml-0">
            <Home className="w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={() => navigate('/tournaments')} className="-ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tournaments
          </Button>
        </div>

        {tournament.status === 'upcoming' && tournament.start_date && (
          <Card className="p-4 sm:p-6 mb-6 border-2 border-primary/50 bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Timer className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Tournament starts in</p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary">{timeRemaining}</p>
                </div>
              </div>
              <div className="text-left sm:text-right w-full sm:w-auto">
                <p className="text-sm text-muted-foreground">Start time</p>
                <p className="font-medium text-sm sm:text-base">{new Date(tournament.start_date).toLocaleString()}</p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
              <div className="flex-1 w-full">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">{tournament.name}</h1>
                <Badge className={tournament.status === 'active' ? 'bg-green-500' : tournament.status === 'completed' ? 'bg-gray-500' : 'bg-blue-500'}>
                  {tournament.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {tournament.status === 'upcoming' && (
                  <Button onClick={() => setInviteDialogOpen(true)} variant="outline" size="lg" className="flex-1 sm:flex-none">
                    <UserPlus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Invite Friends</span>
                    <span className="sm:hidden">Invite</span>
                  </Button>
                )}
                {canJoin && (
                  <Button onClick={handleJoinTournament} size="lg" className="flex-1 sm:flex-none">
                    Join Tournament
                  </Button>
                )}
                {canStart && (
                  <Button onClick={handleStartTournament} size="lg" className="flex-1 sm:flex-none">
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                )}
              </div>
            </div>
            {tournament.description && (
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">{tournament.description}</p>
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
                <p className="text-2xl font-bold capitalize">{formatTournamentFormat(tournament.format)}</p>
                <p className="text-sm text-muted-foreground">Format</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold mb-4">Participants</h3>
            <div className="space-y-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
              {participants.map((participant, index) => (
                <div key={participant.id} className="flex items-center justify-between p-2 sm:p-3 rounded bg-accent/50 text-sm sm:text-base">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-bold text-muted-foreground flex-shrink-0">#{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{participant.profiles?.display_name || participant.profiles?.username}</p>
                      <p className="text-xs text-muted-foreground">Rating: {participant.profiles?.rating || 1200}</p>
                    </div>
                  </div>
                  {participant.status === 'eliminated' && (
                    <Badge variant="outline" className="text-xs flex-shrink-0">Eliminated</Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {(tournament.status === 'active' || tournament.status === 'completed') && (
          <Tabs defaultValue="bracket" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 max-w-md mx-auto">
              <TabsTrigger value="bracket" className="text-xs sm:text-sm">
                {tournament.format === 'single_elimination' ? 'Bracket' : 'Matches'}
              </TabsTrigger>
              <TabsTrigger value="standings" className="text-xs sm:text-sm">Standings</TabsTrigger>
              <TabsTrigger value="schedule" className="text-xs sm:text-sm">Schedule</TabsTrigger>
            </TabsList>

            <TabsContent value="bracket">
              {tournament.format === 'single_elimination' ? (
                <Card className="p-4 sm:p-6">
                  <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Tournament Bracket</h2>
                  <div className="overflow-x-auto">
                    <TournamentBracket matches={matches} tournament={tournament} />
                  </div>
                </Card>
              ) : (
                <Card className="p-4 sm:p-6">
                  <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">All Matches</h2>
                  <div className="space-y-3 sm:space-y-4">
                    {matches.map((match: any) => (
                      <div key={match.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-2 sm:gap-0">
                        <div className="flex-1 w-full sm:w-auto">
                          <p className="font-medium text-sm sm:text-base">
                            {match.player1?.display_name || match.player1?.username || "TBD"}
                          </p>
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground mx-0 sm:mx-4">vs</span>
                        <div className="flex-1 text-left sm:text-right w-full sm:w-auto">
                          <p className="font-medium text-sm sm:text-base">
                            {match.player2?.display_name || match.player2?.username || "TBD"}
                          </p>
                        </div>
                        <div className="ml-0 sm:ml-4 min-w-[120px] w-full sm:w-auto mt-2 sm:mt-0">
                          {match.status === 'completed' && match.winner && (
                            <Badge className="bg-green-500 w-full sm:w-auto justify-center text-xs">
                              {match.winner.display_name || match.winner.username} won
                            </Badge>
                          )}
                          {match.status === 'in_progress' && (
                            <Badge className="bg-blue-500 w-full sm:w-auto justify-center text-xs">In Progress</Badge>
                          )}
                          {match.status === 'ready' && (
                            <Badge variant="outline" className="w-full sm:w-auto justify-center text-xs">Ready</Badge>
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

      {/* Invite Friends Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Invite Friends to Tournament</DialogTitle>
            <DialogDescription className="text-sm">
              Select friends to invite to "{tournament?.name}"
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh] sm:max-h-[400px] pr-2 sm:pr-4">
            {friends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No friends to invite</p>
                <p className="text-xs mt-1">Add friends first to invite them</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((friend: any) => {
                  const isAlreadyParticipant = participants.some(
                    (p: any) => p.user_id === friend.id
                  );
                  
                  return (
                    <div
                      key={friend.id}
                      className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border ${
                        isAlreadyParticipant ? 'opacity-50 bg-muted' : 'hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <Checkbox
                          id={`friend-${friend.id}`}
                          disabled={isAlreadyParticipant || sendingInvites}
                          onCheckedChange={(checked) => {
                            const checkbox = document.getElementById(`friend-${friend.id}`) as HTMLInputElement;
                            if (checkbox) checkbox.dataset.checked = checked ? 'true' : 'false';
                          }}
                        />
                        <label
                          htmlFor={`friend-${friend.id}`}
                          className="flex flex-col cursor-pointer min-w-0 flex-1"
                        >
                          <span className="font-medium text-sm sm:text-base truncate">
                            {friend.display_name || friend.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Rating: {friend.rating || 1200}
                          </span>
                        </label>
                      </div>
                      {isAlreadyParticipant && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          Joined
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(false)}
              disabled={sendingInvites}
              className="flex-1 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const selectedIds: string[] = [];
                friends.forEach((friend: any) => {
                  const checkbox = document.getElementById(`friend-${friend.id}`) as HTMLInputElement;
                  if (checkbox?.dataset.checked === 'true') {
                    selectedIds.push(friend.id);
                  }
                });
                if (selectedIds.length > 0) {
                  handleInviteFriends(selectedIds);
                }
              }}
              disabled={sendingInvites || friends.length === 0}
              className="flex-1 text-sm"
            >
              {sendingInvites ? 'Sending...' : 'Send Invites'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};