interface Player {
  user_id: string;
  points: number;
  opponents: string[];
}

export function generateSwissPairings(
  participants: any[],
  existingMatches: any[]
): Array<[string, string]> {
  // Calculate points and opponents for each player
  const players: Player[] = participants.map(p => {
    const playerMatches = existingMatches.filter(
      m => m.player1_id === p.user_id || m.player2_id === p.user_id
    );

    const wins = playerMatches.filter(m => m.winner_id === p.user_id).length;
    const draws = playerMatches.filter(
      m => m.status === 'completed' && !m.winner_id
    ).length;
    const points = wins + (draws * 0.5);

    const opponents = playerMatches
      .map(m => m.player1_id === p.user_id ? m.player2_id : m.player1_id)
      .filter(Boolean);

    return {
      user_id: p.user_id,
      points,
      opponents
    };
  });

  // Sort by points (descending)
  players.sort((a, b) => b.points - a.points);

  const pairings: Array<[string, string]> = [];
  const paired = new Set<string>();

  // Try to pair players with similar points
  for (let i = 0; i < players.length; i++) {
    if (paired.has(players[i].user_id)) continue;

    // Find best opponent
    for (let j = i + 1; j < players.length; j++) {
      if (paired.has(players[j].user_id)) continue;

      // Check if they haven't played before
      if (!players[i].opponents.includes(players[j].user_id)) {
        pairings.push([players[i].user_id, players[j].user_id]);
        paired.add(players[i].user_id);
        paired.add(players[j].user_id);
        break;
      }
    }

    // If no valid pairing found and player still unpaired (odd number scenario)
    if (!paired.has(players[i].user_id) && i === players.length - 1) {
      // Give bye (handled by calling function)
      break;
    }
  }

  return pairings;
}

export function calculateSwissRounds(numPlayers: number): number {
  // Standard Swiss: ceil(log2(numPlayers))
  return Math.ceil(Math.log2(numPlayers));
}