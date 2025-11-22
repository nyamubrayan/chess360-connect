import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface TrainingHeatmapProps {
  moveStats: {
    host_good_moves: number;
    host_mistakes: number;
    host_blunders: number;
    guest_good_moves: number;
    guest_mistakes: number;
    guest_blunders: number;
  };
  isHost: boolean;
}

export function TrainingHeatmap({ moveStats, isHost }: TrainingHeatmapProps) {
  const playerStats = isHost
    ? {
        good: moveStats.host_good_moves,
        mistakes: moveStats.host_mistakes,
        blunders: moveStats.host_blunders,
      }
    : {
        good: moveStats.guest_good_moves,
        mistakes: moveStats.guest_mistakes,
        blunders: moveStats.guest_blunders,
      };

  const total = playerStats.good + playerStats.mistakes + playerStats.blunders;
  
  const getPercentage = (value: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  const goodPct = getPercentage(playerStats.good);
  const mistakesPct = getPercentage(playerStats.mistakes);
  const blundersPct = getPercentage(playerStats.blunders);

  return (
    <Card className="gradient-card border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Performance Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {total === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            Make moves to track your performance
          </div>
        ) : (
          <>
            {/* Good Moves */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-500 font-medium">Good Moves</span>
                <span className="text-muted-foreground font-mono">{playerStats.good} ({goodPct}%)</span>
              </div>
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500/80 transition-all duration-500"
                  style={{ width: `${goodPct}%` }}
                />
              </div>
            </div>

            {/* Mistakes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-orange-500 font-medium">Mistakes</span>
                <span className="text-muted-foreground font-mono">{playerStats.mistakes} ({mistakesPct}%)</span>
              </div>
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500/80 transition-all duration-500"
                  style={{ width: `${mistakesPct}%` }}
                />
              </div>
            </div>

            {/* Blunders */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-500 font-medium">Blunders</span>
                <span className="text-muted-foreground font-mono">{playerStats.blunders} ({blundersPct}%)</span>
              </div>
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500/80 transition-all duration-500"
                  style={{ width: `${blundersPct}%` }}
                />
              </div>
            </div>

            {/* Overall Accuracy */}
            <div className="pt-3 mt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Accuracy</span>
                <span className="text-2xl font-bold text-primary">
                  {goodPct}%
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
