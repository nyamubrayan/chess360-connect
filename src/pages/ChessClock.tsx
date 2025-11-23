import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Play, Pause, RotateCcw, Settings, Zap, Users, Share2, Link2, ArrowLeft } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RealtimeChannel } from "@supabase/supabase-js";

const ChessClock = () => {
  const { toast } = useToast();
  const [whiteTime, setWhiteTime] = useState(300);
  const [blackTime, setBlackTime] = useState(300);
  const [isWhiteTurn, setIsWhiteTurn] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [timeControl, setTimeControl] = useState(300);
  const [increment, setIncrement] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [playerSide, setPlayerSide] = useState<"white" | "black">("white");
  const [whiteMoves, setWhiteMoves] = useState(0);
  const [blackMoves, setBlackMoves] = useState(0);
  const [moveTimings, setMoveTimings] = useState<number[]>([]);
  const [lastMoveTime, setLastMoveTime] = useState<number>(Date.now());
  const [showReport, setShowReport] = useState(false);
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);
  const [gameResult, setGameResult] = useState<"white" | "black" | "draw" | null>(null);
  
  // Multi-device state
  const [multiDeviceMode, setMultiDeviceMode] = useState(false);
  const [multiDeviceSetup, setMultiDeviceSetup] = useState(false);
  const [sessionCode, setSessionCode] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [guestConnected, setGuestConnected] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  
  const { playMove } = useChessSounds();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Generate a random 6-character code
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Create multi-device session
  const handleCreateSession = async () => {
    if (!isConfigured) {
      toast({
        title: "Configure Clock First",
        description: "Please select a time control before creating a session",
        variant: "destructive",
      });
      return;
    }

    try {
      const code = generateCode();
      
      const { data, error } = await supabase
        .from('chess_clock_sessions')
        .insert({
          session_code: code,
          host_player_side: playerSide,
          time_control: timeControl,
          time_increment: increment,
          white_time: whiteTime,
          black_time: blackTime,
          is_white_turn: true,
          guest_connected: false,
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(data.id);
      setSessionCode(code);
      setIsHost(true);
      setMultiDeviceMode(true);
      setShowCodeDialog(true);
      setSettingsOpen(false);
      
      // Subscribe to session updates
      subscribeToSession(data.id);
      
      toast({
        title: "Session Created!",
        description: `Share code ${code} with your opponent`,
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      });
    }
  };

  // Join existing session
  const handleJoinSession = async () => {
    if (!codeInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session code",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chess_clock_sessions')
        .select()
        .eq('session_code', codeInput.toUpperCase())
        .single();

      if (error || !data) {
        toast({
          title: "Error",
          description: "Invalid session code",
          variant: "destructive",
        });
        return;
      }

      // Update session to mark guest as connected
      await supabase
        .from('chess_clock_sessions')
        .update({ guest_connected: true })
        .eq('id', data.id);

      setSessionId(data.id);
      setSessionCode(data.session_code);
      setIsHost(false);
      setMultiDeviceMode(true);
      setShowCodeDialog(false);
      setSettingsOpen(false);
      setIsConfigured(true);
      
      // Set player side opposite to host
      const guestSide = data.host_player_side === 'white' ? 'black' : 'white';
      setPlayerSide(guestSide);
      
      // Sync clock state
      setTimeControl(data.time_control);
      setIncrement(data.time_increment);
      setWhiteTime(data.white_time);
      setBlackTime(data.black_time);
      setIsWhiteTurn(data.is_white_turn);
      setWhiteMoves(data.white_moves);
      setBlackMoves(data.black_moves);
      
      // Subscribe to session updates
      subscribeToSession(data.id);
      
      toast({
        title: "Connected!",
        description: `You're playing as ${guestSide}`,
      });
    } catch (error) {
      console.error('Error joining session:', error);
      toast({
        title: "Error",
        description: "Failed to join session",
        variant: "destructive",
      });
    }
  };

  // Subscribe to realtime session updates
  const subscribeToSession = (sessionIdParam: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`clock_session_${sessionIdParam}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chess_clock_sessions',
          filter: `id=eq.${sessionIdParam}`,
        },
        (payload) => {
          console.log('Realtime clock update', payload);
          const data = payload.new as any;
          
          setWhiteTime(data.white_time);
          setBlackTime(data.black_time);
          setIsWhiteTurn(data.is_white_turn);
          setIsActive(!data.is_paused);
          setWhiteMoves(data.white_moves);
          setBlackMoves(data.black_moves);
          setGuestConnected(data.guest_connected);
          
          if (data.game_result) {
            setGameResult(data.game_result);
            setShowReport(true);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  // Update session in database
  const updateSession = async (updates: any) => {
    if (!sessionId) return;
    
    try {
      await supabase
        .from('chess_clock_sessions')
        .update(updates)
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        if (isWhiteTurn) {
          setWhiteTime((prev) => {
            const newTime = prev - 1;
            if (multiDeviceMode) {
              updateSession({ white_time: newTime });
            }
            if (newTime <= 0) {
              setIsActive(false);
              setShowReport(true);
              if (multiDeviceMode) {
                updateSession({ game_result: 'black', is_paused: true });
              }
            }
            return Math.max(0, newTime);
          });
        } else {
          setBlackTime((prev) => {
            const newTime = prev - 1;
            if (multiDeviceMode) {
              updateSession({ black_time: newTime });
            }
            if (newTime <= 0) {
              setIsActive(false);
              setShowReport(true);
              if (multiDeviceMode) {
                updateSession({ game_result: 'white', is_paused: true });
              }
            }
            return Math.max(0, newTime);
          });
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isWhiteTurn, multiDeviceMode, sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Fallback polling to keep both devices in sync
  useEffect(() => {
    if (!multiDeviceMode || !sessionId || isActive) return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('chess_clock_sessions')
          .select()
          .eq('id', sessionId)
          .single();

        if (error || !data) return;

        setWhiteTime(data.white_time);
        setBlackTime(data.black_time);
        setIsWhiteTurn(data.is_white_turn);
        setWhiteMoves(data.white_moves);
        setBlackMoves(data.black_moves);
        setGuestConnected(data.guest_connected);
        
        if (data.game_result && !gameResult) {
          const result = data.game_result as "white" | "black" | "draw";
          setGameResult(result);
          setShowReport(true);
        }
      } catch (err) {
        console.error('Polling error for clock session', err);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [multiDeviceMode, sessionId, isActive, gameResult]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClockPress = (player: "white" | "black") => {
    // Only allow clicks on your own side in multi-device mode
    if (multiDeviceMode && player !== playerSide) {
      return;
    }

    // At game start (no moves made), ONLY Black can press to start the clock
    if (whiteMoves === 0 && blackMoves === 0 && !isActive) {
      if (player !== "black") {
        toast({
          title: "Black Starts First",
          description: "Black must press their clock to start the game",
        });
        return;
      }
      
      // Black starts the clock, which begins White's time
      playMove();
      setIsActive(true);
      setLastMoveTime(Date.now());
      const newMoves = 1;
      const newTime = blackTime + increment;
      setBlackMoves(newMoves);
      setBlackTime(newTime);
      setIsWhiteTurn(true); // White's clock starts running
      
      if (multiDeviceMode) {
        updateSession({ 
          black_moves: newMoves,
          black_time: newTime,
          is_white_turn: true,
          is_paused: false,
          is_active: true,
        });
      }
      return;
    }

    if (!isActive) {
      setIsActive(true);
      setLastMoveTime(Date.now());
      if (multiDeviceMode) {
        updateSession({ is_paused: false, is_active: true });
      }
    }

    if ((player === "white" && isWhiteTurn) || (player === "black" && !isWhiteTurn)) {
      playMove();
      
      const currentTime = Date.now();
      const timeSpent = (currentTime - lastMoveTime) / 1000;
      setMoveTimings(prev => [...prev, timeSpent]);
      setLastMoveTime(currentTime);
      
      if (player === "white") {
        const newMoves = whiteMoves + 1;
        const newTime = whiteTime + increment;
        setWhiteMoves(newMoves);
        setWhiteTime(newTime);
        if (multiDeviceMode) {
          updateSession({ 
            white_moves: newMoves,
            white_time: newTime,
            is_white_turn: false,
            is_paused: false,
          });
        }
      } else {
        const newMoves = blackMoves + 1;
        const newTime = blackTime + increment;
        setBlackMoves(newMoves);
        setBlackTime(newTime);
        if (multiDeviceMode) {
          updateSession({ 
            black_moves: newMoves,
            black_time: newTime,
            is_white_turn: true,
            is_paused: false,
          });
        }
      }
      
      setIsWhiteTurn(!isWhiteTurn);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setWhiteTime(timeControl);
    setBlackTime(timeControl);
    setIsWhiteTurn(true);
    setWhiteMoves(0);
    setBlackMoves(0);
    setMoveTimings([]);
    setShowReport(false);
    setGameResult(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    if (multiDeviceMode && sessionId) {
      updateSession({
        white_time: timeControl,
        black_time: timeControl,
        is_white_turn: true,
        white_moves: 0,
        black_moves: 0,
        is_paused: false,
        is_active: false,
        game_result: null,
      });
    }
  };

  const handlePause = () => {
    if (isActive) {
      setIsActive(false);
      setPauseMenuOpen(true);
      if (multiDeviceMode) {
        updateSession({ is_paused: true });
      }
    }
  };

  const handleResume = () => {
    setPauseMenuOpen(false);
    setIsActive(true);
    if (multiDeviceMode) {
      updateSession({ is_paused: false });
    }
  };

  const handleGameEnd = (result: "white" | "black" | "draw") => {
    setIsActive(false);
    setGameResult(result);
    setShowReport(true);
    setPauseMenuOpen(false);
    if (multiDeviceMode) {
      updateSession({ game_result: result, is_paused: true });
    }
  };

  const handlePlayAnother = () => {
    setWhiteTime(timeControl);
    setBlackTime(timeControl);
    setIsWhiteTurn(true);
    setWhiteMoves(0);
    setBlackMoves(0);
    setMoveTimings([]);
    setShowReport(false);
    setGameResult(null);
    setIsActive(false);
    
    if (multiDeviceMode && sessionId) {
      updateSession({
        white_time: timeControl,
        black_time: timeControl,
        is_white_turn: true,
        white_moves: 0,
        black_moves: 0,
        is_paused: false,
        is_active: false,
        game_result: null,
      });
    }
  };

  const applyPreset = (minutes: number, incrementSeconds: number) => {
    setTimeControl(minutes * 60);
    setIncrement(incrementSeconds);
    setWhiteTime(minutes * 60);
    setBlackTime(minutes * 60);
    setIsActive(false);
    setIsWhiteTurn(true);
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
    setIsWhiteTurn(true);
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

  // Calculate statistics
  const calculateStats = (moves: number) => {
    if (moves === 0) return { avgTime: 0, fastestMove: 0, slowestMove: 0 };
    
    const playerMoveTimings = moveTimings.filter((_, idx) => {
      if (playerSide === "white") {
        return idx % 2 === 0;
      } else {
        return idx % 2 === 1;
      }
    });
    
    if (playerMoveTimings.length === 0) return { avgTime: 0, fastestMove: 0, slowestMove: 0 };
    
    const avgTime = playerMoveTimings.reduce((a, b) => a + b, 0) / playerMoveTimings.length;
    const fastestMove = Math.min(...playerMoveTimings);
    const slowestMove = Math.max(...playerMoveTimings);
    
    return { avgTime, fastestMove, slowestMove };
  };

  const whiteStats = calculateStats(whiteMoves);
  const blackStats = calculateStats(blackMoves);

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col overflow-hidden">
      {/* Return to Clock Floating Button - shows when page is not visible */}
      <AnimatePresence>
        {!isPageVisible && isActive && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                boxShadow: [
                  "0 0 20px rgba(var(--primary), 0.3)",
                  "0 0 40px rgba(var(--primary), 0.6)",
                  "0 0 20px rgba(var(--primary), 0.3)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="bg-gradient-to-br from-primary to-accent rounded-full p-8 shadow-2xl border-4 border-background pointer-events-auto cursor-pointer"
              onClick={() => window.focus()}
            >
              <div className="text-center space-y-3">
                <motion.div
                  animate={{ x: [0, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowLeft className="w-16 h-16 text-primary-foreground mx-auto" />
                </motion.div>
                <div className="text-primary-foreground">
                  <p className="text-xl font-bold">Return to Clock</p>
                  <p className="text-sm opacity-90">Game in progress</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Black to Start Indicator */}
      <AnimatePresence>
        {whiteMoves === 0 && blackMoves === 0 && !isActive && isConfigured && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="bg-gradient-to-r from-primary via-primary to-accent text-primary-foreground px-8 py-6 rounded-2xl shadow-2xl border-2 border-primary-foreground/20"
            >
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-6 h-6 rounded-full bg-primary-foreground"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-3xl font-bold">Black Starts First</span>
              </div>
              <p className="text-sm opacity-90 mt-2 text-center">Press Black's clock to begin</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Code Display Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="gradient-card border-2 border-primary/20 shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Share Session Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">Share this code with your opponent:</p>
              <div className="bg-muted p-6 rounded-lg">
                <p className="text-4xl font-mono font-bold tracking-widest text-primary">{sessionCode}</p>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {guestConnected ? "✓ Opponent connected!" : "Waiting for opponent..."}
              </p>
            </div>
            <Button onClick={() => setShowCodeDialog(false)} className="w-full">
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border/50 backdrop-blur-sm bg-background/80 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <Clock className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">Chess Clock</h1>
          {multiDeviceMode && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="font-mono">{sessionCode}</span>
            </div>
          )}
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
              {/* Multi-Device Options */}
              {!multiDeviceMode && (
                <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Multi-Device Mode
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Use two phones - each player sees only their clock
                  </p>
                  
                  {!multiDeviceSetup ? (
                    // Step 1: Enable Multi-Device
                    <div className="flex flex-col gap-3">
                      <Button 
                        onClick={() => setMultiDeviceSetup(true)}
                        className="w-full h-12 font-bold"
                        variant="default"
                        disabled={!isConfigured}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Start Multi-Device Setup
                      </Button>
                      {!isConfigured && (
                        <p className="text-xs text-muted-foreground text-center">
                          Select a time control first
                        </p>
                      )}
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">Or join existing</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter Code"
                          value={codeInput}
                          onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                          className="flex-1 font-mono text-center text-lg"
                          maxLength={6}
                        />
                        <Button onClick={handleJoinSession} variant="outline" size="lg">
                          <Link2 className="w-4 h-4 mr-2" />
                          Join
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Step 2 & 3: Select Side and Generate Code
                    <div className="space-y-4">
                      <div className="bg-background/50 p-3 rounded-lg border border-border">
                        <p className="text-sm font-medium mb-3">Step 1: Choose your side</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant={playerSide === "white" ? "default" : "outline"}
                            onClick={() => setPlayerSide("white")}
                            className="h-14 text-base font-bold"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full border-4 border-current" />
                              White
                            </div>
                          </Button>
                          <Button 
                            variant={playerSide === "black" ? "default" : "outline"}
                            onClick={() => setPlayerSide("black")}
                            className="h-14 text-base font-bold"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-current" />
                              Black
                            </div>
                          </Button>
                        </div>
                      </div>
                      
                      <div className="bg-background/50 p-3 rounded-lg border border-border">
                        <p className="text-sm font-medium mb-3">Step 2: Generate connection code</p>
                        <Button 
                          onClick={handleCreateSession}
                          className="w-full h-12 font-bold"
                          variant="default"
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Generate Code
                        </Button>
                      </div>
                      
                      <Button 
                        onClick={() => setMultiDeviceSetup(false)}
                        variant="ghost"
                        className="w-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Side Selection (only for single device) */}
              {!multiDeviceSetup && (
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
                      disabled={multiDeviceMode}
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
                      disabled={multiDeviceMode}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-current" />
                        Black
                      </div>
                    </Button>
                  </div>
                </div>
              )}

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
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Single device mode - show both clocks */}
        {!multiDeviceMode && (
          <>
            {/* Black Player Clock */}
            <motion.div
              className="flex-1 flex items-center justify-center cursor-pointer relative overflow-hidden transition-all duration-500"
              style={{
                background: !isWhiteTurn && isActive 
                  ? "linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.2), hsl(var(--primary) / 0.1))"
                  : "linear-gradient(135deg, hsl(var(--muted) / 0.2), hsl(var(--background)))"
              }}
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

            {/* Divider */}
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

            {/* White Player Clock */}
            <motion.div
              className="flex-1 flex items-center justify-center cursor-pointer relative overflow-hidden transition-all duration-500"
              style={{
                background: isWhiteTurn && isActive 
                  ? "linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.2), hsl(var(--primary) / 0.1))"
                  : "linear-gradient(135deg, hsl(var(--muted) / 0.2), hsl(var(--background)))"
              }}
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
                  <div className="w-6 h-6 rounded-full border-4 border-current" />
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
          </>
        )}

        {/* Multi-device mode - show ONLY player's own clock fullscreen */}
        {multiDeviceMode && (
          <div className="relative h-full w-full">
            <motion.div
              className="absolute inset-0 flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-500"
              style={{
                background: ((playerSide === 'white' && isWhiteTurn) || (playerSide === 'black' && !isWhiteTurn)) && isActive
                  ? "linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.2), hsl(var(--primary) / 0.1))"
                  : "linear-gradient(135deg, hsl(var(--muted) / 0.2), hsl(var(--background)))"
              }}
              onClick={() => handleClockPress(playerSide)}
              whileTap={{ scale: 0.98 }}
              animate={((playerSide === 'white' && isWhiteTurn) || (playerSide === 'black' && !isWhiteTurn)) && isActive ? {
                boxShadow: [
                  "inset 0 0 60px rgba(var(--primary), 0.2)",
                  "inset 0 0 80px rgba(var(--primary), 0.4)",
                  "inset 0 0 60px rgba(var(--primary), 0.2)"
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AnimatePresence>
                {((playerSide === 'white' && isWhiteTurn) || (playerSide === 'black' && !isWhiteTurn)) && isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 border-4 border-primary shadow-[0_0_30px_rgba(var(--primary),0.5)]"
                  />
                )}
              </AnimatePresence>

              {((playerSide === 'white' && isWhiteTurn) || (playerSide === 'black' && !isWhiteTurn)) && isActive && (
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

              <div className="text-center space-y-4 sm:space-y-6 md:space-y-8 p-4 sm:p-6 md:p-8 z-10 w-full max-w-4xl">
                <motion.div 
                  className="flex items-center justify-center gap-3 sm:gap-4"
                  animate={((playerSide === 'white' && isWhiteTurn) || (playerSide === 'black' && !isWhiteTurn)) && isActive ? { y: [0, -5, 0] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {playerSide === 'white' ? (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-4 border-current shadow-xl" />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-foreground shadow-xl border-4 border-background" />
                  )}
                  <span className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-wide capitalize">{playerSide}</span>
                </motion.div>
                
                <motion.div 
                  className={`text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[12rem] font-mono font-black tracking-tighter ${
                    getTimeColor(
                      playerSide === 'white' ? whiteTime : blackTime,
                      ((playerSide === 'white' && isWhiteTurn) || (playerSide === 'black' && !isWhiteTurn)) && isActive
                    )
                  }`}
                  animate={((playerSide === 'white' && isWhiteTurn) || (playerSide === 'black' && !isWhiteTurn)) && isActive ? { scale: [1, 1.03, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                  style={{ 
                    textShadow: ((playerSide === 'white' && isWhiteTurn) || (playerSide === 'black' && !isWhiteTurn)) && isActive 
                      ? "0 0 30px rgba(var(--primary), 0.5)" 
                      : "none" 
                  }}
                >
                  {formatTime(playerSide === 'white' ? whiteTime : blackTime)}
                </motion.div>

                {increment > 0 && (
                  <div className="text-sm sm:text-base md:text-lg text-muted-foreground flex items-center justify-center gap-2 font-medium">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-gold" />
                    +{increment}s increment
                  </div>
                )}

                {/* Show turn indicator */}
                <div className="text-base sm:text-lg md:text-xl font-semibold">
                  {((playerSide === 'white' && isWhiteTurn) || (playerSide === 'black' && !isWhiteTurn)) ? (
                    <span className="text-primary animate-pulse">Your Turn - Tap to Move</span>
                  ) : (
                    <span className="text-muted-foreground">Opponent's Turn</span>
                  )}
                </div>
              </div>
            </motion.div>
            
            {/* Opponent Time Badge at Bottom */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <motion.div 
                className="bg-muted/90 backdrop-blur-md border-2 border-border rounded-full px-4 sm:px-6 py-2 sm:py-3 shadow-xl"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {playerSide === 'black' ? (
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-current" />
                    ) : (
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-foreground" />
                    )}
                    <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                      {playerSide === 'white' ? 'Black' : 'White'}
                    </span>
                  </div>
                  <span className="text-base sm:text-lg md:text-xl font-mono font-bold">
                    {formatTime(playerSide === 'white' ? blackTime : whiteTime)}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      {isConfigured && (
        <div className="p-6 flex items-center justify-center gap-4 border-t border-border/50 backdrop-blur-sm bg-background/80">
          <Button
            onClick={handlePause}
            disabled={!isActive}
            size="lg"
            variant="outline"
            className="h-14 px-8"
          >
            <Pause className="w-5 h-5 mr-2" />
            Pause
          </Button>
          <Button
            onClick={handleReset}
            size="lg"
            variant="outline"
            className="h-14 px-8"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Reset
          </Button>
        </div>
      )}

      {/* Pause Menu Dialog */}
      <Dialog open={pauseMenuOpen} onOpenChange={setPauseMenuOpen}>
        <DialogContent className="gradient-card border-2 border-primary/20 shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Game Paused</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button onClick={handleResume} className="w-full h-14 text-lg font-bold">
              <Play className="w-5 h-5 mr-2" />
              Resume
            </Button>
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => handleGameEnd("white")} variant="outline" className="h-12">
                White Won
              </Button>
              <Button onClick={() => handleGameEnd("black")} variant="outline" className="h-12">
                Black Won
              </Button>
              <Button onClick={() => handleGameEnd("draw")} variant="outline" className="h-12">
                Draw
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Game Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="gradient-card border-2 border-primary/20 shadow-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center">
              📊 Game Statistics
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold">
                {gameResult === "white" ? "White Wins!" : gameResult === "black" ? "Black Wins!" : "Draw!"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* White Stats */}
              <div className="space-y-4 p-6 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className="w-8 h-8 rounded-full border-4 border-current" />
                  <h3 className="text-2xl font-bold">White</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Moves:</span>
                    <span className="font-bold text-lg">{whiteMoves}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Avg Time/Move:</span>
                    <span className="font-bold text-lg">{whiteStats.avgTime.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Fastest Move:</span>
                    <span className="font-bold text-lg">{whiteStats.fastestMove.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Slowest Move:</span>
                    <span className="font-bold text-lg">{whiteStats.slowestMove.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-muted-foreground">Time Left:</span>
                    <span className="font-bold text-xl text-primary">{formatTime(whiteTime)}</span>
                  </div>
                </div>
              </div>

              {/* Black Stats */}
              <div className="space-y-4 p-6 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className="w-8 h-8 rounded-full bg-current" />
                  <h3 className="text-2xl font-bold">Black</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Moves:</span>
                    <span className="font-bold text-lg">{blackMoves}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Avg Time/Move:</span>
                    <span className="font-bold text-lg">{blackStats.avgTime.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Fastest Move:</span>
                    <span className="font-bold text-lg">{blackStats.fastestMove.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Slowest Move:</span>
                    <span className="font-bold text-lg">{blackStats.slowestMove.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-muted-foreground">Time Left:</span>
                    <span className="font-bold text-xl text-primary">{formatTime(blackTime)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button
                onClick={() => {
                  setShowReport(false);
                  setIsConfigured(false);
                  setSettingsOpen(true);
                  setWhiteTime(timeControl);
                  setBlackTime(timeControl);
                  setIsWhiteTurn(true);
                  setWhiteMoves(0);
                  setBlackMoves(0);
                  setMoveTimings([]);
                  setGameResult(null);
                  setIsActive(false);
                  setMultiDeviceMode(false);
                  setMultiDeviceSetup(false);
                  setGuestConnected(false);
                  setSessionId(null);
                  setSessionCode("");
                  setIsHost(false);
                }}
                size="lg"
                variant="outline"
                className="h-14 text-base font-bold"
              >
                <Settings className="w-5 h-5 mr-2" />
                New Game Settings
              </Button>
              <Button
                onClick={handlePlayAnother}
                size="lg"
                className="h-14 text-base font-bold"
              >
                <Play className="w-5 h-5 mr-2" />
                Play Another Game
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChessClock;