import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface ChessClockProps {
  whiteTime: number;
  blackTime: number;
  isWhiteTurn: boolean;
  isActive: boolean;
}

const ChessClock = ({ whiteTime, blackTime, isWhiteTurn, isActive }: ChessClockProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = (seconds: number, isActive: boolean) => {
    if (!isActive) return "text-muted-foreground";
    if (seconds < 30) return "text-destructive animate-pulse";
    if (seconds < 60) return "text-gold";
    return "text-foreground";
  };

  return (
    <div className="space-y-3">
      <Card className={`p-4 ${!isWhiteTurn && isActive ? "ring-2 ring-primary" : ""}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-foreground" />
            <span className="font-medium">Black</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className={`text-2xl font-mono font-bold ${getTimeColor(blackTime, !isWhiteTurn && isActive)}`}>
              {formatTime(blackTime)}
            </span>
          </div>
        </div>
      </Card>

      <Card className={`p-4 ${isWhiteTurn && isActive ? "ring-2 ring-primary" : ""}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-foreground" />
            <span className="font-medium">White</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className={`text-2xl font-mono font-bold ${getTimeColor(whiteTime, isWhiteTurn && isActive)}`}>
              {formatTime(whiteTime)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChessClock;
