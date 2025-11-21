import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface Match {
  id: string;
  round: number;
  match_number: number;
  player1: { username: string; display_name: string } | null;
  player2: { username: string; display_name: string } | null;
  winner: { username: string; display_name: string } | null;
  game_id: string | null;
  status: string;
}

interface TournamentBracketProps {
  matches: Match[];
  tournament: any;
}

export function TournamentBracket({ matches, tournament }: TournamentBracketProps) {
  const navigate = useNavigate();

  const rounds = matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const maxRound = Math.max(...Object.keys(rounds).map(Number), 0);

  const getRoundName = (round: number) => {
    const totalRounds = maxRound;
    if (round === totalRounds) return "Finals";
    if (round === totalRounds - 1) return "Semi-Finals";
    if (round === totalRounds - 2) return "Quarter-Finals";
    return `Round ${round}`;
  };

  return (
    <div className="flex gap-8 overflow-x-auto pb-4">
      {Object.entries(rounds).sort(([a], [b]) => Number(a) - Number(b)).map(([round, roundMatches]) => (
        <div key={round} className="flex-shrink-0">
          <h3 className="text-lg font-bold mb-4 text-center">{getRoundName(Number(round))}</h3>
          <div className="space-y-4">
            {roundMatches.map((match) => (
              <Card key={match.id} className="p-4 w-64">
                <div className="space-y-2">
                  <div className={`p-2 rounded ${match.winner?.username === match.player1?.username ? 'bg-green-500/20 border border-green-500' : 'bg-accent'}`}>
                    <p className="font-medium truncate">
                      {match.player1?.display_name || match.player1?.username || "TBD"}
                    </p>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">vs</div>
                  <div className={`p-2 rounded ${match.winner?.username === match.player2?.username ? 'bg-green-500/20 border border-green-500' : 'bg-accent'}`}>
                    <p className="font-medium truncate">
                      {match.player2?.display_name || match.player2?.username || "TBD"}
                    </p>
                  </div>
                </div>
                {match.game_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3"
                    onClick={() => navigate(`/game/${match.game_id}`)}
                  >
                    View Game
                  </Button>
                )}
                {match.status === 'completed' && match.winner && (
                  <p className="text-xs text-center mt-2 text-green-500 font-medium">
                    Winner: {match.winner.display_name || match.winner.username}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}