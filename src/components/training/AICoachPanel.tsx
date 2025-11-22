import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { ChessBoardComponent } from '@/components/chess/ChessBoard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Lightbulb, TrendingUp, AlertCircle, Loader2, RotateCcw, User, Users, Flag, Swords, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrainingTimer } from './TrainingTimer';
import { TrainingHeatmap } from './TrainingHeatmap';

type GameMode = 'solo' | 'friend';

interface TimeControl {
  time: number;
  increment: number;
  label: string;
}

const TIME_CONTROLS: TimeControl[] = [
  { time: 3, increment: 0, label: '3+0' },
  { time: 3, increment: 2, label: '3+2' },
  { time: 5, increment: 0, label: '5+0' },
  { time: 5, increment: 3, label: '5+3' },
  { time: 10, increment: 0, label: '10+0' },
  { time: 10, increment: 5, label: '10+5' },
];

interface MoveAnalysis {
  evaluation: string;
  suggestion: string;
  explanation: string;
  type: "good" | "questionable" | "mistake" | "blunder";
}

interface Friend {
  id: string;
  friend_id: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function AICoachPanel() {
  const [chess] = useState(new Chess());
  const [position, setPosition] = useState(chess.fen());
  const [analysis, setAnalysis] = useState<MoveAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [isHost, setIsHost] = useState(true);
  const [waitingForFriend, setWaitingForFriend] = useState(false);
  const [searchingForOpponent, setSearchingForOpponent] = useState(false);
  const [opponentInfo, setOpponentInfo] = useState<{
    username: string;
    display_name: string | null;
    rating: number;
  } | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [moveStats, setMoveStats] = useState({
    host_good_moves: 0,
    host_mistakes: 0,
    host_blunders: 0,
    guest_good_moves: 0,
    guest_mistakes: 0,
    guest_blunders: 0
  });
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>(TIME_CONTROLS[2]);
  const [whiteTimeRemaining, setWhiteTimeRemaining] = useState(selectedTimeControl.time * 60);
  const [blackTimeRemaining, setBlackTimeRemaining] = useState(selectedTimeControl.time * 60);
  const [lastMoveTime, setLastMoveTime] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  // Check for active training session on load (for guests joining)
  useEffect(() => {
    if (!userId) return;

    const checkActiveSession = async () => {
      console.log('Checking for active training session for user:', userId);
      
      const { data: activeSession, error: sessionError } = await supabase
        .from('training_sessions')
        .select('*')
        .or(`host_player_id.eq.${userId},guest_player_id.eq.${userId}`)
        .eq('status', 'active')
        .maybeSingle();

      console.log('Active session check result:', activeSession, 'Error:', sessionError);

      if (activeSession) {
        console.log('Loading active training session:', activeSession);
        
        // Load the session
        setSessionId(activeSession.id);
        setGameMode('friend');
        const userIsHost = activeSession.host_player_id === userId;
        setIsHost(userIsHost);
        setPlayerColor(userIsHost ? 'white' : 'black');
        setSearchingForOpponent(false);
        
        // Fetch opponent info
        const opponentId = userIsHost ? activeSession.guest_player_id : activeSession.host_player_id;
        if (opponentId) {
          const { data: opponentProfile } = await supabase
            .from('profiles')
            .select('username, display_name, rating')
            .eq('id', opponentId)
            .single();
          
          if (opponentProfile) {
            setOpponentInfo(opponentProfile);
          }
        }
        
        // Load the board state
        if (activeSession.current_fen) {
          chess.load(activeSession.current_fen);
          setPosition(activeSession.current_fen);
          setMoveCount(activeSession.move_count);
          setLastMove(activeSession.last_move);
        }

        // Load move stats
        setMoveStats({
          host_good_moves: activeSession.host_good_moves || 0,
          host_mistakes: activeSession.host_mistakes || 0,
          host_blunders: activeSession.host_blunders || 0,
          guest_good_moves: activeSession.guest_good_moves || 0,
          guest_mistakes: activeSession.guest_mistakes || 0,
          guest_blunders: activeSession.guest_blunders || 0
        });

        toast.success('Joined active training session');
      }
    };

    checkActiveSession();
  }, [userId]);

  // Poll for training match
  useEffect(() => {
    if (!searchingForOpponent || !userId) return;

    const pollInterval = setInterval(async () => {
      // Check if someone else is in the training queue with matching time control
      const { data: queueEntries } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('mode', 'training')
        .eq('time_control', selectedTimeControl.time)
        .eq('time_increment', selectedTimeControl.increment)
        .neq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (queueEntries && queueEntries.length > 0) {
        const opponent = queueEntries[0];
        
        // Remove both from queue
        await supabase
          .from('matchmaking_queue')
          .delete()
          .in('user_id', [userId, opponent.user_id]);

        // Randomly assign colors
        const userIsWhite = Math.random() > 0.5;
        
        // Create training session
        const { data: session, error } = await supabase
          .from('training_sessions')
          .insert({
            host_player_id: userIsWhite ? userId : opponent.user_id,
            guest_player_id: userIsWhite ? opponent.user_id : userId,
            status: 'active',
          })
          .select()
          .single();

        if (!error && session) {
          setSessionId(session.id);
          setGameMode('friend');
          setIsHost(userIsWhite);
          setPlayerColor(userIsWhite ? 'white' : 'black');
          setSearchingForOpponent(false);
          
          // Fetch opponent info
          const { data: opponentProfile } = await supabase
            .from('profiles')
            .select('username, display_name, rating')
            .eq('id', opponent.user_id)
            .single();
          
          if (opponentProfile) {
            setOpponentInfo(opponentProfile);
          }
          
          toast.success(`Opponent found! You are playing as ${userIsWhite ? 'White' : 'Black'}.`);
        }
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [searchingForOpponent, userId, selectedTimeControl]);

  // Real-time session sync for friend mode
  useEffect(() => {
    if (gameMode !== 'friend' || !sessionId) return;

    const channel = supabase
      .channel(`training-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'training_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const session = payload.new;
          if (session.current_fen !== position) {
            chess.load(session.current_fen);
            setPosition(session.current_fen);
            setMoveCount(session.move_count);
            setLastMove(session.last_move);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameMode, sessionId, position]);

  const startTrainingMatchmaking = async () => {
    if (!userId) return;

    try {
      setSearchingForOpponent(true);
      
      // Add to matchmaking queue with selected time control
      const { error } = await supabase
        .from('matchmaking_queue')
        .insert({
          user_id: userId,
          mode: 'training',
          time_control: selectedTimeControl.time,
          time_increment: selectedTimeControl.increment,
        });

      if (error) throw error;

      toast.info(`Searching for opponent (${selectedTimeControl.label})...`);
    } catch (error) {
      console.error('Error joining training matchmaking:', error);
      toast.error('Failed to start matchmaking');
      setSearchingForOpponent(false);
    }
  };

  const cancelTrainingMatchmaking = async () => {
    if (!userId) return;

    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('user_id', userId)
      .eq('mode', 'training');

    setSearchingForOpponent(false);
    toast.info('Matchmaking cancelled');
  };

  const analyzeMoveInRealTime = async (moveNotation: string) => {
    setIsAnalyzing(true);
    setMoveCount(prev => prev + 1);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-move', {
        body: {
          fen: position,
          lastMove: moveNotation,
          playerColor: chess.turn() === 'w' ? 'black' : 'white',
        },
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      
      // Track move quality stats
      if (data.analysis && sessionId) {
        const isHostMove = (gameMode === 'friend' && isHost) || gameMode !== 'friend';
        const newStats = { ...moveStats };
        
        if (data.analysis.type === 'good') {
          if (isHostMove) newStats.host_good_moves++;
          else newStats.guest_good_moves++;
        } else if (data.analysis.type === 'mistake') {
          if (isHostMove) newStats.host_mistakes++;
          else newStats.guest_mistakes++;
        } else if (data.analysis.type === 'blunder') {
          if (isHostMove) newStats.host_blunders++;
          else newStats.guest_blunders++;
        }
        
        setMoveStats(newStats);
        
        // Update database with new stats
        await supabase
          .from('training_sessions')
          .update(newStats)
          .eq('id', sessionId);
      }
    } catch (error: any) {
      console.error('Error analyzing move:', error);
      toast.error('Failed to analyze move. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };


  const handleMove = async (from: string, to: string) => {
    try {
      const move = chess.move({ from, to, promotion: 'q' });
      
      if (move) {
        const newPosition = chess.fen();
        setPosition(newPosition);
        setLastMove(`${move.from}${move.to}`);
        
        const currentTime = new Date().toISOString();
        setLastMoveTime(currentTime);

        // Update time with increment
        if (chess.turn() === 'b') {
          // White just moved, add increment to white's time
          setWhiteTimeRemaining(prev => prev + selectedTimeControl.increment);
        } else {
          // Black just moved, add increment to black's time
          setBlackTimeRemaining(prev => prev + selectedTimeControl.increment);
        }
        
        // Update session if in friend mode
        if (gameMode === 'friend' && sessionId) {
          await supabase
            .from('training_sessions')
            .update({
              current_fen: newPosition,
              move_count: moveCount + 1,
              last_move: move.san,
            })
            .eq('id', sessionId);
        }

        setMoveCount(prev => prev + 1);
        
        // Analyze the move and track stats
        await analyzeMoveInRealTime(move.san);
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
  };

  const handleReset = async () => {
    chess.reset();
    const startingFen = chess.fen();
    setPosition(startingFen);
    setAnalysis(null);
    setMoveCount(0);
    setLastMove(null);
    setLastMoveTime(null);
    setSessionStartTime(new Date());
    setWhiteTimeRemaining(selectedTimeControl.time * 60);
    setBlackTimeRemaining(selectedTimeControl.time * 60);
    setMoveStats({
      host_good_moves: 0,
      host_mistakes: 0,
      host_blunders: 0,
      guest_good_moves: 0,
      guest_mistakes: 0,
      guest_blunders: 0
    });
    
    // Update session if in friend mode
    if (gameMode === 'friend' && sessionId) {
      await supabase
        .from('training_sessions')
        .update({
          current_fen: startingFen,
          move_count: 0,
          last_move: null,
          ...moveStats
        })
        .eq('id', sessionId);
    }
    
    toast.success('Board reset');
  };

  const handleResign = async () => {
    if (!sessionId || gameMode !== 'friend') return;

    try {
      const duration = sessionStartTime 
        ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000)
        : 0;
      
      const hostTotal = moveStats.host_good_moves + moveStats.host_mistakes + moveStats.host_blunders;
      const guestTotal = moveStats.guest_good_moves + moveStats.guest_mistakes + moveStats.guest_blunders;
      
      const hostAccuracy = hostTotal > 0 
        ? ((moveStats.host_good_moves / hostTotal) * 100)
        : null;
      const guestAccuracy = guestTotal > 0
        ? ((moveStats.guest_good_moves / guestTotal) * 100)
        : null;

      await supabase
        .from('training_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration,
          host_move_accuracy: hostAccuracy,
          guest_move_accuracy: guestAccuracy
        })
        .eq('id', sessionId);

      toast.success('Training session ended');
      
      // Reset state
      setSessionId(null);
      setOpponentInfo(null);
      setGameMode('solo');
      await handleReset();
    } catch (error) {
      console.error('Error resigning:', error);
      toast.error('Failed to end session');
    }
  };

  const handleChallengeToRealGame = async () => {
    if (!userId || !opponentInfo || !sessionId) return;

    try {
      // Get opponent ID
      const { data: session } = await supabase
        .from('training_sessions')
        .select('host_player_id, guest_player_id')
        .eq('id', sessionId)
        .single();

      if (!session) return;

      const opponentId = session.host_player_id === userId 
        ? session.guest_player_id 
        : session.host_player_id;

      if (!opponentId) return;

      // Create notification for opponent
      await supabase
        .from('notifications')
        .insert({
          user_id: opponentId,
          sender_id: userId,
          type: 'game_challenge',
          title: 'Real Game Challenge',
          message: `Challenge received from training match - accept to play a rated game!`,
        });

      toast.success('Challenge sent to opponent!');
    } catch (error) {
      console.error('Error sending challenge:', error);
      toast.error('Failed to send challenge');
    }
  };

  const handleModeChange = async (mode: GameMode) => {
    // Complete current session if it exists
    if (sessionId && sessionStartTime && gameMode === 'friend') {
      const duration = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
      const hostTotal = moveStats.host_good_moves + moveStats.host_mistakes + moveStats.host_blunders;
      const guestTotal = moveStats.guest_good_moves + moveStats.guest_mistakes + moveStats.guest_blunders;
      
      const hostAccuracy = hostTotal > 0 
        ? ((moveStats.host_good_moves / hostTotal) * 100)
        : null;
      const guestAccuracy = guestTotal > 0
        ? ((moveStats.guest_good_moves / guestTotal) * 100)
        : null;

      await supabase
        .from('training_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration,
          host_move_accuracy: hostAccuracy,
          guest_move_accuracy: guestAccuracy
        })
        .eq('id', sessionId);
    } else if (sessionId) {
      // Delete incomplete sessions
      await supabase
        .from('training_sessions')
        .delete()
        .eq('id', sessionId);
    }

    // Cancel any pending matchmaking
    if (searchingForOpponent) {
      await cancelTrainingMatchmaking();
    }
    
    setSessionId(null);
    setSearchingForOpponent(false);
    setOpponentInfo(null);
    setSessionStartTime(new Date());
    setGameMode(mode);
    await handleReset();
    
    if (mode === 'friend') {
      startTrainingMatchmaking();
    }
  };

  const handleTimeControlChange = (timeControl: TimeControl) => {
    setSelectedTimeControl(timeControl);
    setWhiteTimeRemaining(timeControl.time * 60);
    setBlackTimeRemaining(timeControl.time * 60);
  };

  const handleTakeback = () => {
    if (gameMode !== 'solo') return;
    
    const history = chess.history();
    if (history.length === 0) {
      toast.info('No moves to take back');
      return;
    }
    
    chess.undo();
    setPosition(chess.fen());
    setMoveCount(prev => Math.max(0, prev - 1));
    setAnalysis(null);
    toast.success('Move taken back');
  };

  const getMoveTypeColor = (type: string) => {
    switch (type) {
      case "good": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "questionable": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "mistake": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "blunder": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getMoveTypeIcon = (type: string) => {
    switch (type) {
      case "good": return <TrendingUp className="w-4 h-4" />;
      case "questionable": return <Lightbulb className="w-4 h-4" />;
      case "mistake": return <AlertCircle className="w-4 h-4" />;
      case "blunder": return <AlertCircle className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen w-full">
      {/* Professional Header Bar */}
      <div className="bg-card/50 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gradient">Smart Chess Mentor Training</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {gameMode === 'solo' ? 'Solo practice with instant AI analysis' : 'Train with opponent - both receive AI feedback'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Time Control Selector */}
              <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div className="flex gap-1">
                  {TIME_CONTROLS.map((tc) => (
                    <Button
                      key={tc.label}
                      variant={selectedTimeControl.label === tc.label ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleTimeControlChange(tc)}
                      disabled={gameMode === 'friend' && sessionId !== null}
                      className="h-8 px-3 text-xs"
                    >
                      {tc.label}
                    </Button>
                  ))}
                </div>
              </div>
              {gameMode === 'solo' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTakeback}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Takeback
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mode Selector */}
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant={gameMode === 'solo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('solo')}
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Solo Practice
            </Button>
            <Button
              variant={gameMode === 'friend' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('friend')}
              className="flex items-center gap-2"
              disabled={searchingForOpponent}
            >
              <Users className="w-4 h-4" />
              Play Online
            </Button>
            {searchingForOpponent && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Finding opponent...</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={cancelTrainingMatchmaking}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Centered Board Layout */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Left Panel - Performance & Stats */}
          <div className="xl:col-span-3 space-y-4">
            {/* Performance Heatmap */}
            {gameMode === 'friend' && sessionId && (
              <TrainingHeatmap moveStats={moveStats} isHost={isHost} />
            )}

            {/* Instructions Card */}
            <Card className="gradient-card border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Training Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                {gameMode === 'solo' ? (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      <span>Play moves for both sides freely</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      <span>Receive instant AI analysis after each move</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      <span>Practice various positions and tactics</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      <span>Play alternating turns with your opponent</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      <span>Both players receive separate AI feedback</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      <span>Track performance with live accuracy stats</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Move Counter */}
            <Card className="gradient-card">
              <CardContent className="pt-4 text-center">
                <div className="text-3xl font-bold text-primary">{moveCount}</div>
                <div className="text-xs text-muted-foreground mt-1">Moves Played</div>
              </CardContent>
            </Card>
          </div>

          {/* Center Panel - Chess Board */}
          <div className="xl:col-span-6">
            <Card className="gradient-card border-primary/20">
              <CardContent className="pt-6">
                {/* Opponent Info Bar */}
                {gameMode === 'friend' && opponentInfo && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {(opponentInfo.display_name || opponentInfo.username).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">
                            {opponentInfo.display_name || opponentInfo.username}
                          </p>
                          <p className="text-xs text-muted-foreground">@{opponentInfo.username}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="font-mono">
                          {opponentInfo.rating || 1200}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">Rating</p>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResign}
                        className="flex-1 flex items-center justify-center gap-2"
                      >
                        <Flag className="w-3 h-3" />
                        Resign
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleChallengeToRealGame}
                        className="flex-1 flex items-center justify-center gap-2"
                      >
                        <Swords className="w-3 h-3" />
                        Challenge
                      </Button>
                    </div>
                  </div>
                )}

                {/* Timer Display */}
                {gameMode === 'friend' && sessionId && (
                  <div className="mb-6">
                    <TrainingTimer
                      timeControl={selectedTimeControl.time}
                      timeIncrement={selectedTimeControl.increment}
                      currentTurn={chess.turn()}
                      playerColor={playerColor}
                      lastMoveAt={lastMoveTime}
                      whiteTimeRemaining={whiteTimeRemaining}
                      blackTimeRemaining={blackTimeRemaining}
                    />
                  </div>
                )}

                {/* Chessboard - Centered */}
                <div className="w-full mx-auto flex justify-center">
                  <div className="w-full max-w-[600px]">
                    <ChessBoardComponent
                      position={position}
                      onMove={handleMove}
                      playerColor={gameMode === 'friend' ? playerColor : 'white'}
                      disabled={gameMode === 'friend' && chess.turn() !== playerColor.charAt(0)}
                      chess={chess}
                    />
                  </div>
                </div>
                
                {/* Game Status */}
                <div className="mt-6 text-center">
                  {chess.isCheckmate() ? (
                    <Badge variant="destructive" className="text-sm px-4 py-1">
                      Checkmate!
                    </Badge>
                  ) : chess.isCheck() ? (
                    <Badge variant="outline" className="text-sm px-4 py-1 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                      Check!
                    </Badge>
                  ) : chess.isDraw() ? (
                    <Badge variant="secondary" className="text-sm px-4 py-1">
                      Draw
                    </Badge>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {chess.turn() === 'w' ? 'White' : 'Black'}
                      </span>
                      {' '}to move
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - AI Analysis */}
          <div className="xl:col-span-3 space-y-4">
            <Card className="gradient-card border-primary/20 glow-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                    <span className="text-sm text-muted-foreground">Analyzing move...</span>
                  </div>
                ) : analysis ? (
                  <>
                    {/* Move Type Badge */}
                    <div className="flex items-center justify-center">
                      <Badge className={`${getMoveTypeColor(analysis.type)} px-4 py-1.5 text-sm`}>
                        {getMoveTypeIcon(analysis.type)}
                        <span className="ml-2 capitalize font-semibold">{analysis.type}</span>
                      </Badge>
                    </div>

                    {/* Position Evaluation */}
                    <div className="bg-muted/30 rounded-lg p-3 border border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                        Position Evaluation
                      </p>
                      <p className="text-sm leading-relaxed">{analysis.evaluation}</p>
                    </div>

                    {/* Better Move Suggestion */}
                    {analysis.type !== "good" && (
                      <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                        <p className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                          <Lightbulb className="w-3.5 h-3.5" />
                          Suggested Alternative
                        </p>
                        <p className="text-sm leading-relaxed">{analysis.suggestion}</p>
                      </div>
                    )}

                    {/* Detailed Explanation */}
                    <div className="bg-muted/30 rounded-lg p-3 border border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                        Explanation
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{analysis.explanation}</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground leading-relaxed px-4">
                      Make your first move to receive instant AI feedback and detailed analysis
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
