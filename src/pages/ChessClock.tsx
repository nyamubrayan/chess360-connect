import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Play, Pause, RotateCcw, Settings, Zap } from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border/50 backdrop-blur-sm bg-background/80 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <Clock className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">Chess Clock</h1>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
              <Settings className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="gradient-card">
            <DialogHeader>
              <DialogTitle>Clock Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gold" />
                  Quick Presets
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => applyPreset(1, 0)} className="hover:border-primary">
                    ⚡ Bullet (1+0)
                  </Button>
                  <Button variant="outline" onClick={() => applyPreset(3, 0)} className="hover:border-primary">
                    🔥 Blitz (3+0)
                  </Button>
                  <Button variant="outline" onClick={() => applyPreset(3, 2)} className="hover:border-primary">
                    🎯 Blitz (3+2)
                  </Button>
                  <Button variant="outline" onClick={() => applyPreset(5, 0)} className="hover:border-primary">
                    ⏱️ Blitz (5+0)
                  </Button>
                  <Button variant="outline" onClick={() => applyPreset(10, 0)} className="hover:border-primary">
                    🚀 Rapid (10+0)
                  </Button>
                  <Button variant="outline" onClick={() => applyPreset(15, 10)} className="hover:border-primary">
                    ♟️ Rapid (15+10)
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

      {/* Split Clock Display */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        {/* Black Player - Top/Left */}
        <motion.div
          className={`flex-1 flex items-center justify-center cursor-pointer relative overflow-hidden transition-all duration-500 ${
            !isWhiteTurn && isActive 
              ? "bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10" 
              : "bg-gradient-to-br from-muted/20 to-background"
          }`}
          onClick={() => handleClockPress("black")}
          whileTap={{ scale: 0.98 }}
          animate={!isWhiteTurn && isActive ? {
            boxShadow: [
              "inset 0 0 60px rgba(var(--primary), 0.2)",
              "inset 0 0 80px rgba(var(--primary), 0.4)",
              "inset 0 0 60px rgba(var(--primary), 0.2)"
            ]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* Active Glow Border */}
          <AnimatePresence>
            {!isWhiteTurn && isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 border-4 border-primary shadow-[0_0_30px_rgba(var(--primary),0.5)]"
              />
            )}
          </AnimatePresence>

          {/* Animated Background Pattern */}
          {!isWhiteTurn && isActive && (
            <motion.div
              className="absolute inset-0 opacity-10"
              animate={{
                backgroundPosition: ["0% 0%", "100% 100%"],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{
                backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
                backgroundSize: "50px 50px",
              }}
            />
          )}

          <div className="text-center space-y-6 p-8 z-10">
            <motion.div 
              className="flex items-center justify-center gap-3"
              animate={!isWhiteTurn && isActive ? { y: [0, -5, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-10 h-10 rounded-full bg-foreground shadow-xl border-4 border-background" />
              <span className="text-3xl font-bold tracking-wide">Black</span>
            </motion.div>
            
            <motion.div 
              className={`text-8xl md:text-9xl font-mono font-black tracking-tighter ${getTimeColor(blackTime, !isWhiteTurn && isActive)}`}
              animate={!isWhiteTurn && isActive ? { scale: [1, 1.03, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              style={{ textShadow: !isWhiteTurn && isActive ? "0 0 30px rgba(var(--primary), 0.5)" : "none" }}
            >
              {formatTime(blackTime)}
            </motion.div>

            {increment > 0 && (
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-2 font-medium">
                <Zap className="w-5 h-5 text-gold" />
                +{increment}s increment
              </div>
            )}
          </div>
        </motion.div>

        {/* Divider with Pulse Animation */}
        <motion.div 
          className="h-2 md:h-auto md:w-2 relative"
          animate={{
            background: [
              "linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))",
              "linear-gradient(to right, hsl(var(--accent)), hsl(var(--primary)))",
            ]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="absolute inset-0 bg-gradient-to-r md:bg-gradient-to-b from-primary via-accent to-primary animate-pulse opacity-50" />
        </motion.div>

        {/* White Player - Bottom/Right */}
        <motion.div
          className={`flex-1 flex items-center justify-center cursor-pointer relative overflow-hidden transition-all duration-500 ${
            isWhiteTurn && isActive 
              ? "bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10" 
              : "bg-gradient-to-br from-muted/20 to-background"
          }`}
          onClick={() => handleClockPress("white")}
          whileTap={{ scale: 0.98 }}
          animate={isWhiteTurn && isActive ? {
            boxShadow: [
              "inset 0 0 60px rgba(var(--primary), 0.2)",
              "inset 0 0 80px rgba(var(--primary), 0.4)",
              "inset 0 0 60px rgba(var(--primary), 0.2)"
            ]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* Active Glow Border */}
          <AnimatePresence>
            {isWhiteTurn && isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 border-4 border-primary shadow-[0_0_30px_rgba(var(--primary),0.5)]"
              />
            )}
          </AnimatePresence>

          {/* Animated Background Pattern */}
          {isWhiteTurn && isActive && (
            <motion.div
              className="absolute inset-0 opacity-10"
              animate={{
                backgroundPosition: ["0% 0%", "100% 100%"],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{
                backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
                backgroundSize: "50px 50px",
              }}
            />
          )}

          <div className="text-center space-y-6 p-8 z-10">
            <motion.div 
              className="flex items-center justify-center gap-3"
              animate={isWhiteTurn && isActive ? { y: [0, -5, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-10 h-10 rounded-full border-4 border-foreground shadow-xl bg-background" />
              <span className="text-3xl font-bold tracking-wide">White</span>
            </motion.div>
            
            <motion.div 
              className={`text-8xl md:text-9xl font-mono font-black tracking-tighter ${getTimeColor(whiteTime, isWhiteTurn && isActive)}`}
              animate={isWhiteTurn && isActive ? { scale: [1, 1.03, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              style={{ textShadow: isWhiteTurn && isActive ? "0 0 30px rgba(var(--primary), 0.5)" : "none" }}
            >
              {formatTime(whiteTime)}
            </motion.div>

            {increment > 0 && (
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-2 font-medium">
                <Zap className="w-5 h-5 text-gold" />
                +{increment}s increment
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Controls Footer */}
      <div className="p-6 border-t border-border/50 backdrop-blur-sm bg-background/90 z-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <Button
              onClick={handlePause}
              size="lg"
              variant={isActive ? "default" : "outline"}
              className="w-full sm:w-auto min-w-[140px] shadow-lg"
              disabled={whiteTime === 0 || blackTime === 0}
            >
              {isActive ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
              {isActive ? "Pause" : "Resume"}
            </Button>
            <Button onClick={handleReset} size="lg" variant="outline" className="w-full sm:w-auto min-w-[140px] shadow-lg">
              <RotateCcw className="w-5 h-5 mr-2" />
              Reset
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground font-medium">
              Time Control: <span className="text-foreground font-bold">{formatTime(timeControl)}</span>
              {increment > 0 && <span className="text-gold"> +{increment}s</span>}
            </p>
          </div>

          {/* Winner Message */}
          <AnimatePresence>
            {blackTime === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="mt-6 text-center p-6 bg-gradient-to-r from-success/30 via-success/20 to-success/30 border-2 border-success rounded-xl shadow-xl"
              >
                <p className="text-3xl font-black text-success mb-2">🏆 White Wins!</p>
                <p className="text-sm text-muted-foreground">Black ran out of time</p>
              </motion.div>
            )}

            {whiteTime === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="mt-6 text-center p-6 bg-gradient-to-r from-success/30 via-success/20 to-success/30 border-2 border-success rounded-xl shadow-xl"
              >
                <p className="text-3xl font-black text-success mb-2">🏆 Black Wins!</p>
                <p className="text-sm text-muted-foreground">White ran out of time</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ChessClock;
