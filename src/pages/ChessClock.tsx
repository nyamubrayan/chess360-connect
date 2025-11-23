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
  const [settingsOpen, setSettingsOpen] = useState(true); // Show settings first
  const [isConfigured, setIsConfigured] = useState(false);
  const [playerSide, setPlayerSide] = useState<"white" | "black">("white");
  const [whiteMoves, setWhiteMoves] = useState(0);
  const [blackMoves, setBlackMoves] = useState(0);
  const [moveTimings, setMoveTimings] = useState<number[]>([]);
  const [lastMoveTime, setLastMoveTime] = useState<number>(Date.now());
  const [showReport, setShowReport] = useState(false);
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);
  const [gameResult, setGameResult] = useState<"white" | "black" | "draw" | null>(null);
  const { playMove } = useChessSounds();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        if (isWhiteTurn) {
          setWhiteTime((prev) => {
            if (prev <= 0) {
              setIsActive(false);
              setShowReport(true);
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime((prev) => {
            if (prev <= 0) {
              setIsActive(false);
              setShowReport(true);
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
      setLastMoveTime(Date.now());
    }

    if ((player === "white" && isWhiteTurn) || (player === "black" && !isWhiteTurn)) {
      playMove();
      
      // Track move timing
      const currentTime = Date.now();
      const timeSpent = (currentTime - lastMoveTime) / 1000;
      setMoveTimings(prev => [...prev, timeSpent]);
      setLastMoveTime(currentTime);
      
      // Increment move count
      if (player === "white") {
        setWhiteMoves(prev => prev + 1);
        setWhiteTime((prev) => prev + increment);
      } else {
        setBlackMoves(prev => prev + 1);
        setBlackTime((prev) => prev + increment);
      }
      
      setIsWhiteTurn(!isWhiteTurn);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setWhiteTime(timeControl);
    setBlackTime(timeControl);
    setIsWhiteTurn(playerSide === "white");
    setWhiteMoves(0);
    setBlackMoves(0);
    setMoveTimings([]);
    setShowReport(false);
    setGameResult(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handlePause = () => {
    if (isActive) {
      setIsActive(false);
      setPauseMenuOpen(true);
    }
  };

  const handleResume = () => {
    setPauseMenuOpen(false);
    setIsActive(true);
  };

  const handleGameEnd = (result: "white" | "black" | "draw") => {
    setIsActive(false);
    setGameResult(result);
    setShowReport(true);
    setPauseMenuOpen(false);
    
    // Auto-reset clock after 8 seconds
    setTimeout(() => {
      setWhiteTime(timeControl);
      setBlackTime(timeControl);
      setIsWhiteTurn(playerSide === "white");
      setWhiteMoves(0);
      setBlackMoves(0);
      setMoveTimings([]);
      setShowReport(false);
      setGameResult(null);
    }, 8000);
  };

  const applyPreset = (minutes: number, incrementSeconds: number) => {
    setTimeControl(minutes * 60);
    setIncrement(incrementSeconds);
    setWhiteTime(minutes * 60);
    setBlackTime(minutes * 60);
    setIsActive(false);
    setIsWhiteTurn(playerSide === "white");
    setWhiteMoves(0);
    setBlackMoves(0);
    setMoveTimings([]);
    setShowReport(false);
    setIsConfigured(true);
    setSettingsOpen(false);
  };

  const applyCustomTime = (minutes: number, incrementSeconds: number) => {
    const seconds = minutes * 60;
    setTimeControl(seconds);
    setIncrement(incrementSeconds);
    setWhiteTime(seconds);
    setBlackTime(seconds);
    setIsActive(false);
    setIsWhiteTurn(playerSide === "white");
    setWhiteMoves(0);
    setBlackMoves(0);
    setMoveTimings([]);
    setShowReport(false);
    setIsConfigured(true);
    setSettingsOpen(false);
  };

  const getTimeColor = (seconds: number, active: boolean) => {
    if (!active) return "text-muted-foreground";
    if (seconds < 10) return "text-destructive animate-pulse";
    if (seconds < 30) return "text-destructive";
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
        
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" disabled={!isConfigured}>
              <Settings className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="gradient-card border-2 border-primary/20 shadow-2xl max-w-md" onInteractOutside={(e) => !isConfigured && e.preventDefault()}>
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ⚙️ Clock Settings
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Side Selection */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="text-xl">♟️</span>
                  Choose Your Side
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant={playerSide === "white" ? "default" : "outline"}
                    onClick={() => setPlayerSide("white")}
                    className="h-16 text-lg font-bold transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full border-4 border-current" />
                      White
                    </div>
                  </Button>
                  <Button 
                    variant={playerSide === "black" ? "default" : "outline"}
                    onClick={() => setPlayerSide("black")}
                    className="h-16 text-lg font-bold transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-current" />
                      Black
                    </div>
                  </Button>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-gold" />
                  Quick Presets
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => applyPreset(1, 0)} className="hover:border-primary hover:bg-primary/10 transition-all font-semibold">
                    ⚡ Bullet (1+0)
                  </Button>
                  <Button variant="outline" onClick={() => applyPreset(3, 0)} className="hover:border-primary hover:bg-primary/10 transition-all font-semibold">
                    🔥 Blitz (3+0)
                  </Button>
                  <Button variant="outline" onClick={() => applyPreset(3, 2)} className="hover:border-primary hover:bg-primary/10 transition-all font-semibold">
                    🎯 Blitz (3+2)
                  </Button>
                  <Button variant="outline" onClick={() => applyPreset(5, 0)} className="hover:border-primary hover:bg-primary/10 transition-all font-semibold">
                    ⏱️ Blitz (5+0)
                  </Button>
                  <Button variant="outline" onClick={() => applyPreset(10, 0)} className="hover:border-primary hover:bg-primary/10 transition-all font-semibold">
                    🚀 Rapid (10+0)
                  </Button>
                  <Button variant="outline" onClick={() => applyPreset(15, 10)} className="hover:border-primary hover:bg-primary/10 transition-all font-semibold">
                    ♟️ Rapid (15+10)
                  </Button>
                </div>
              </div>

              {/* Custom Time */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">⚙️ Custom Time</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="font-medium">Minutes per side</Label>
                    <Input
                      type="number"
                      min="1"
                      max="180"
                      defaultValue="5"
                      id="custom-minutes"
                      className="mt-1.5 h-11"
                    />
                  </div>
                  <div>
                    <Label className="font-medium">Increment (seconds)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="60"
                      defaultValue="0"
                      id="custom-increment"
                      className="mt-1.5 h-11"
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
                    className="w-full h-11 font-bold text-base"
                  >
                    Apply Custom Time
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vertical Clock Display */}
      <div className="flex-1 flex flex-col relative">
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
          className="h-2 relative"
          animate={{
            background: [
              "linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))",
              "linear-gradient(to right, hsl(var(--accent)), hsl(var(--primary)))",
            ]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary animate-pulse opacity-50" />
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
              variant="default"
              className="w-full sm:w-auto min-w-[140px] shadow-lg"
              disabled={!isActive || whiteTime === 0 || blackTime === 0}
            >
              <Pause className="w-5 h-5 mr-2" />
              Pause
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

          {/* Pause Menu Dialog */}
          <Dialog open={pauseMenuOpen} onOpenChange={setPauseMenuOpen}>
            <DialogContent className="gradient-card border-2 border-primary/20 shadow-2xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  ⏸️ Game Paused
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <Button
                  onClick={handleResume}
                  size="lg"
                  className="w-full h-14 text-lg font-bold"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Resume
                </Button>
                
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center mb-3">End Game & View Stats</p>
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleGameEnd("white")}
                      variant="outline"
                      size="lg"
                      className="w-full h-12 font-bold hover:bg-success/20 hover:border-success"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full border-4 border-current" />
                        White Won
                      </div>
                    </Button>
                    <Button
                      onClick={() => handleGameEnd("black")}
                      variant="outline"
                      size="lg"
                      className="w-full h-12 font-bold hover:bg-success/20 hover:border-success"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-current" />
                        Black Won
                      </div>
                    </Button>
                    <Button
                      onClick={() => handleGameEnd("draw")}
                      variant="outline"
                      size="lg"
                      className="w-full h-12 font-bold hover:bg-primary/20 hover:border-primary"
                    >
                      🤝 Draw
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Game Report */}
          <AnimatePresence>
            {showReport && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="mt-6 space-y-4"
              >
                {/* Winner Banner */}
                <div className={`text-center p-6 rounded-xl shadow-xl border-2 ${
                  gameResult === "draw" 
                    ? "bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 border-primary"
                    : "bg-gradient-to-r from-success/30 via-success/20 to-success/30 border-success"
                }`}>
                  <p className={`text-3xl font-black mb-2 ${gameResult === "draw" ? "text-primary" : "text-success"}`}>
                    {gameResult === "draw" ? "🤝 Draw!" : 
                     gameResult === "white" ? "🏆 White Wins!" :
                     gameResult === "black" ? "🏆 Black Wins!" :
                     whiteTime === 0 ? "🏆 Black Wins!" : "🏆 White Wins!"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {gameResult === "draw" ? "Game ended in a draw" :
                     gameResult ? "Game concluded by decision" :
                     `${whiteTime === 0 ? "White" : "Black"} ran out of time`}
                  </p>
                </div>

                {/* Game Statistics Report */}
                <div className="p-6 bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 rounded-xl shadow-xl space-y-4">
                  <h3 className="text-2xl font-bold text-center mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    📊 Game Statistics
                  </h3>
                  
                  {/* Both Players Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* White Player Stats */}
                    <div className="space-y-3 p-5 bg-gradient-to-br from-background/80 to-primary/5 rounded-lg border-2 border-border">
                      <div className="flex items-center justify-center gap-2 mb-3 pb-3 border-b border-border">
                        <div className="w-6 h-6 rounded-full border-4 border-foreground shadow-lg" />
                        <span className="font-bold text-xl">White</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-background/60 rounded-lg">
                          <span className="text-sm text-muted-foreground">Moves</span>
                          <span className="font-bold text-lg text-primary">{whiteMoves}</span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-background/60 rounded-lg">
                          <span className="text-sm text-muted-foreground">Avg Time</span>
                          <span className="font-bold text-lg text-accent">
                            {whiteMoves > 0 
                              ? `${(moveTimings.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) / whiteMoves).toFixed(1)}s`
                              : "0s"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-background/60 rounded-lg">
                          <span className="text-sm text-muted-foreground">Fastest</span>
                          <span className="font-bold text-lg text-success">
                            {moveTimings.filter((_, i) => i % 2 === 0).length > 0
                              ? `${Math.min(...moveTimings.filter((_, i) => i % 2 === 0)).toFixed(1)}s`
                              : "0s"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-background/60 rounded-lg">
                          <span className="text-sm text-muted-foreground">Slowest</span>
                          <span className="font-bold text-lg text-destructive">
                            {moveTimings.filter((_, i) => i % 2 === 0).length > 0
                              ? `${Math.max(...moveTimings.filter((_, i) => i % 2 === 0)).toFixed(1)}s`
                              : "0s"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/40">
                          <span className="text-sm font-medium">Time Left</span>
                          <span className="font-bold text-lg text-primary">{formatTime(whiteTime)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Black Player Stats */}
                    <div className="space-y-3 p-5 bg-gradient-to-br from-background/80 to-primary/5 rounded-lg border-2 border-border">
                      <div className="flex items-center justify-center gap-2 mb-3 pb-3 border-b border-border">
                        <div className="w-6 h-6 rounded-full bg-foreground shadow-lg" />
                        <span className="font-bold text-xl">Black</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-background/60 rounded-lg">
                          <span className="text-sm text-muted-foreground">Moves</span>
                          <span className="font-bold text-lg text-primary">{blackMoves}</span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-background/60 rounded-lg">
                          <span className="text-sm text-muted-foreground">Avg Time</span>
                          <span className="font-bold text-lg text-accent">
                            {blackMoves > 0 
                              ? `${(moveTimings.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0) / blackMoves).toFixed(1)}s`
                              : "0s"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-background/60 rounded-lg">
                          <span className="text-sm text-muted-foreground">Fastest</span>
                          <span className="font-bold text-lg text-success">
                            {moveTimings.filter((_, i) => i % 2 === 1).length > 0
                              ? `${Math.min(...moveTimings.filter((_, i) => i % 2 === 1)).toFixed(1)}s`
                              : "0s"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-background/60 rounded-lg">
                          <span className="text-sm text-muted-foreground">Slowest</span>
                          <span className="font-bold text-lg text-destructive">
                            {moveTimings.filter((_, i) => i % 2 === 1).length > 0
                              ? `${Math.max(...moveTimings.filter((_, i) => i % 2 === 1)).toFixed(1)}s`
                              : "0s"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/40">
                          <span className="text-sm font-medium">Time Left</span>
                          <span className="font-bold text-lg text-primary">{formatTime(blackTime)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ChessClock;
