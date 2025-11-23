import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Play, Pause, RotateCcw, Settings } from "lucide-react";
import { useChessSounds } from "@/hooks/useChessSounds";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const ChessClock = () => {
  const [whiteTime, setWhiteTime] = useState(300); // 5 minutes default
  const [blackTime, setBlackTime] = useState(300);
  const [isWhiteTurn, setIsWhiteTurn] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [timeControl, setTimeControl] = useState(300);
  const [increment, setIncrement] = useState(0);
  const { playMove } = useChessSounds();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        if (isWhiteTurn) {
          setWhiteTime((prev) => {
            if (prev <= 0) {
              setIsActive(false);
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime((prev) => {
            if (prev <= 0) {
              setIsActive(false);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isWhiteTurn]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClockPress = (player: "white" | "black") => {
    if (!isActive) {
      setIsActive(true);
    }

    if ((player === "white" && isWhiteTurn) || (player === "black" && !isWhiteTurn)) {
      playMove();
      
      // Add increment to current player's time
      if (player === "white") {
        setWhiteTime((prev) => prev + increment);
      } else {
        setBlackTime((prev) => prev + increment);
      }
      
      setIsWhiteTurn(!isWhiteTurn);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setWhiteTime(timeControl);
    setBlackTime(timeControl);
    setIsWhiteTurn(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handlePause = () => {
    setIsActive(!isActive);
  };

  const applyPreset = (minutes: number, incrementSeconds: number) => {
    setTimeControl(minutes * 60);
    setIncrement(incrementSeconds);
    setWhiteTime(minutes * 60);
    setBlackTime(minutes * 60);
    setIsActive(false);
    setIsWhiteTurn(true);
  };

  const applyCustomTime = (minutes: number, incrementSeconds: number) => {
    const seconds = minutes * 60;
    setTimeControl(seconds);
    setIncrement(incrementSeconds);
    setWhiteTime(seconds);
    setBlackTime(seconds);
    setIsActive(false);
    setIsWhiteTurn(true);
  };

  const getTimeColor = (seconds: number, active: boolean) => {
    if (!active) return "text-muted-foreground";
    if (seconds < 10) return "text-destructive animate-pulse";
    if (seconds < 30) return "text-destructive";
    if (seconds < 60) return "text-gold";
    return "text-foreground";
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Chess Clock</h1>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Time Control Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Quick Presets</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => applyPreset(1, 0)}>
                      Bullet (1+0)
                    </Button>
                    <Button variant="outline" onClick={() => applyPreset(3, 0)}>
                      Blitz (3+0)
                    </Button>
                    <Button variant="outline" onClick={() => applyPreset(3, 2)}>
                      Blitz (3+2)
                    </Button>
                    <Button variant="outline" onClick={() => applyPreset(5, 0)}>
                      Blitz (5+0)
                    </Button>
                    <Button variant="outline" onClick={() => applyPreset(10, 0)}>
                      Rapid (10+0)
                    </Button>
                    <Button variant="outline" onClick={() => applyPreset(15, 10)}>
                      Rapid (15+10)
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Custom Time</h3>
                  <div className="space-y-3">
                    <div>
                      <Label>Minutes per side</Label>
                      <Input
                        type="number"
                        min="1"
                        max="180"
                        defaultValue="5"
                        id="custom-minutes"
                      />
                    </div>
                    <div>
                      <Label>Increment (seconds)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="60"
                        defaultValue="0"
                        id="custom-increment"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        const minutes = parseInt(
                          (document.getElementById("custom-minutes") as HTMLInputElement).value
                        );
                        const inc = parseInt(
                          (document.getElementById("custom-increment") as HTMLInputElement).value
                        );
                        applyCustomTime(minutes, inc);
                      }}
                      className="w-full"
                    >
                      Apply Custom Time
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {/* Black Clock */}
          <Card
            className={`p-8 cursor-pointer transition-all ${
              !isWhiteTurn && isActive
                ? "ring-4 ring-primary shadow-lg scale-105"
                : "opacity-75"
            }`}
            onClick={() => handleClockPress("black")}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-foreground" />
                <span className="text-xl font-medium">Black</span>
              </div>
              <div className={`text-6xl font-mono font-bold ${getTimeColor(blackTime, !isWhiteTurn && isActive)}`}>
                {formatTime(blackTime)}
              </div>
            </div>
          </Card>

          {/* Control Buttons */}
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePause}
              disabled={whiteTime === 0 || blackTime === 0}
            >
              {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset}>
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>

          {/* White Clock */}
          <Card
            className={`p-8 cursor-pointer transition-all ${
              isWhiteTurn && isActive
                ? "ring-4 ring-primary shadow-lg scale-105"
                : "opacity-75"
            }`}
            onClick={() => handleClockPress("white")}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border-4 border-foreground" />
                <span className="text-xl font-medium">White</span>
              </div>
              <div className={`text-6xl font-mono font-bold ${getTimeColor(whiteTime, isWhiteTurn && isActive)}`}>
                {formatTime(whiteTime)}
              </div>
            </div>
          </Card>
        </div>

        {(whiteTime === 0 || blackTime === 0) && (
          <Card className="p-6 text-center bg-primary/10 border-primary">
            <p className="text-2xl font-bold">
              {whiteTime === 0 ? "Black" : "White"} wins on time!
            </p>
          </Card>
        )}

        <Card className="p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground text-center">
            Tap the active player's clock to switch turns. Time control: {formatTime(timeControl)}
            {increment > 0 && ` +${increment}s`}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default ChessClock;
