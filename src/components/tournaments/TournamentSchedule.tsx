import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users } from "lucide-react";
import { format, addMinutes, parseISO, isBefore, isAfter } from "date-fns";

interface Match {
  id: string;
  round: number;
  match_number: number;
  player1: { username: string; display_name: string } | null;
  player2: { username: string; display_name: string } | null;
  winner_id: string | null;
  status: string;
  created_at: string;
}

interface TournamentScheduleProps {
  tournament: any;
  matches: Match[];
}

export function TournamentSchedule({ tournament, matches }: TournamentScheduleProps) {
  const calculateMatchStartTime = (round: number, matchNumber: number) => {
    if (!tournament.start_date) return null;

    const tournamentStart = parseISO(tournament.start_date);
    
    // Estimate match duration: time_control * 2 (both players) + 5 min buffer
    const estimatedMatchDuration = Math.ceil((tournament.time_control * 2) / 60) + 5;
    
    if (tournament.format === 'single_elimination') {
      // Single elimination: rounds are sequential, all matches in a round start together
      const roundDelay = (round - 1) * estimatedMatchDuration;
      return addMinutes(tournamentStart, roundDelay);
    } else if (tournament.format === 'round_robin') {
      // Round robin: all matches start at tournament start (can be played in any order)
      // Stagger by match number to give rough schedule
      const matchDelay = (matchNumber - 1) * estimatedMatchDuration;
      return addMinutes(tournamentStart, matchDelay);
    } else if (tournament.format === 'swiss') {
      // Swiss: rounds are sequential
      const roundDelay = (round - 1) * estimatedMatchDuration;
      return addMinutes(tournamentStart, roundDelay);
    }

    return tournamentStart;
  };

  const getMatchStatus = (match: Match, estimatedStart: Date | null) => {
    if (match.status === 'completed') return { label: 'Completed', color: 'bg-green-500' };
    if (match.status === 'in_progress') return { label: 'In Progress', color: 'bg-blue-500' };
    
    if (estimatedStart) {
      const now = new Date();
      if (isBefore(now, estimatedStart)) {
        return { label: 'Scheduled', color: 'bg-gray-500' };
      } else if (isAfter(now, estimatedStart)) {
        return { label: 'Ready', color: 'bg-yellow-500' };
      }
    }
    
    return { label: 'Pending', color: 'bg-gray-500' };
  };

  // Group matches by round
  const roundGroups = matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const getRoundName = (round: number, totalRounds: number) => {
    if (tournament.format === 'single_elimination') {
      if (round === totalRounds) return "Finals";
      if (round === totalRounds - 1) return "Semi-Finals";
      if (round === totalRounds - 2) return "Quarter-Finals";
    }
    return `Round ${round}`;
  };

  const totalRounds = Math.max(...Object.keys(roundGroups).map(Number), 0);

  if (!tournament.start_date) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Schedule Not Available</h3>
          <p className="text-muted-foreground">
            Tournament start date has not been set
          </p>
        </div>
      </Card>
    );
  }

  const tournamentStartTime = parseISO(tournament.start_date);
  const now = new Date();
  const hasStarted = isAfter(now, tournamentStartTime);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Tournament Schedule</h2>
        {!hasStarted && (
          <Badge variant="outline" className="text-sm">
            Starts {format(tournamentStartTime, 'MMM d, yyyy h:mm a')}
          </Badge>
        )}
      </div>

      <div className="space-y-6">
        {Object.entries(roundGroups)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([round, roundMatches]) => {
            const roundNum = Number(round);
            const firstMatchStart = calculateMatchStartTime(roundNum, 1);
            const roundStatus = roundMatches.every(m => m.status === 'completed')
              ? 'completed'
              : roundMatches.some(m => m.status === 'in_progress')
              ? 'in_progress'
              : 'upcoming';

            return (
              <div key={round} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">
                      {getRoundName(roundNum, totalRounds)}
                    </h3>
                    <Badge
                      className={
                        roundStatus === 'completed'
                          ? 'bg-green-500'
                          : roundStatus === 'in_progress'
                          ? 'bg-blue-500'
                          : 'bg-gray-500'
                      }
                    >
                      {roundStatus === 'completed'
                        ? 'Completed'
                        : roundStatus === 'in_progress'
                        ? 'In Progress'
                        : 'Upcoming'}
                    </Badge>
                  </div>
                  {firstMatchStart && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {isBefore(now, firstMatchStart) ? (
                        <span>Starts {format(firstMatchStart, 'h:mm a')}</span>
                      ) : (
                        <span>Started {format(firstMatchStart, 'h:mm a')}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {roundMatches
                    .sort((a, b) => a.match_number - b.match_number)
                    .map((match) => {
                      const estimatedStart = calculateMatchStartTime(roundNum, match.match_number);
                      const status = getMatchStatus(match, estimatedStart);

                      return (
                        <div
                          key={match.id}
                          className="flex items-center justify-between p-3 bg-accent/30 rounded-lg"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Match {match.match_number}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium">
                                  {match.player1?.display_name || match.player1?.username || 'TBD'}
                                </span>
                                <span className="text-muted-foreground">vs</span>
                                <span className="font-medium">
                                  {match.player2?.display_name || match.player2?.username || 'TBD'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {estimatedStart && status.label !== 'Completed' && (
                              <span className="text-xs text-muted-foreground min-w-[70px] text-right">
                                {format(estimatedStart, 'h:mm a')}
                              </span>
                            )}
                            <Badge className={status.color}>{status.label}</Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
      </div>

      <div className="mt-6 p-4 bg-accent/50 rounded-lg">
        <h4 className="font-semibold mb-2 text-sm">Schedule Notes</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Match times are estimates based on {Math.ceil((tournament.time_control * 2) / 60)} minute average game duration</li>
          <li>• Actual start times may vary depending on previous match completion</li>
          {tournament.format === 'round_robin' && (
            <li>• Round-robin matches can be played in any order during the tournament</li>
          )}
          {tournament.format === 'swiss' && (
            <li>• Swiss pairings are generated after each round completes</li>
          )}
        </ul>
      </div>
    </Card>
  );
}