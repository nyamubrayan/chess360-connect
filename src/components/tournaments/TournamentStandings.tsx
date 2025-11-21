import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal } from "lucide-react";

interface Participant {
  id: string;
  user_id: string;
  profiles: {
    username: string;
    display_name: string;
    rating: number;
  };
  status: string;
  placement?: number;
}

interface Match {
  id: string;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  status: string;
}

interface TournamentStandingsProps {
  participants: Participant[];
  matches: Match[];
  format: string;
}

export function TournamentStandings({ participants, matches, format }: TournamentStandingsProps) {
  const calculateStandings = () => {
    const standings = participants.map(participant => {
      const playerMatches = matches.filter(
        m => m.player1_id === participant.user_id || m.player2_id === participant.user_id
      );

      const wins = playerMatches.filter(m => m.winner_id === participant.user_id).length;
      const losses = playerMatches.filter(
        m => m.winner_id && m.winner_id !== participant.user_id
      ).length;
      const draws = playerMatches.filter(
        m => m.status === 'completed' && !m.winner_id
      ).length;
      const played = wins + losses + draws;

      let points = 0;
      if (format === 'round_robin' || format === 'swiss') {
        points = wins + (draws * 0.5);
      }

      return {
        ...participant,
        wins,
        losses,
        draws,
        played,
        points
      };
    });

    // Sort by points (desc), then wins (desc), then rating (desc)
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (b.profiles?.rating || 0) - (a.profiles?.rating || 0);
    });

    return standings;
  };

  const standings = calculateStandings();

  const getMedalIcon = (position: number) => {
    if (position === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (position === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (position === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return null;
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Standings</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-2 font-semibold">Rank</th>
              <th className="text-left py-3 px-2 font-semibold">Player</th>
              <th className="text-center py-3 px-2 font-semibold">Played</th>
              {(format === 'round_robin' || format === 'swiss') && (
                <th className="text-center py-3 px-2 font-semibold">Points</th>
              )}
              <th className="text-center py-3 px-2 font-semibold">W</th>
              <th className="text-center py-3 px-2 font-semibold">D</th>
              <th className="text-center py-3 px-2 font-semibold">L</th>
              <th className="text-center py-3 px-2 font-semibold">Rating</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing, index) => (
              <tr key={standing.id} className="border-b hover:bg-accent/50">
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    {getMedalIcon(index)}
                    <span className="font-bold">{index + 1}</span>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div>
                    <p className="font-medium">
                      {standing.profiles?.display_name || standing.profiles?.username}
                    </p>
                    {standing.status === 'eliminated' && (
                      <Badge variant="outline" className="text-xs mt-1">
                        Eliminated
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="text-center py-3 px-2">{standing.played}</td>
                {(format === 'round_robin' || format === 'swiss') && (
                  <td className="text-center py-3 px-2 font-bold">{standing.points}</td>
                )}
                <td className="text-center py-3 px-2 text-green-600 font-semibold">
                  {standing.wins}
                </td>
                <td className="text-center py-3 px-2 text-muted-foreground">
                  {standing.draws}
                </td>
                <td className="text-center py-3 px-2 text-destructive font-semibold">
                  {standing.losses}
                </td>
                <td className="text-center py-3 px-2 text-muted-foreground">
                  {standing.profiles?.rating || 1200}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}