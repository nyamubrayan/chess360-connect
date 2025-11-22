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
      // Check if someone else is in the training queue
      const { data: queueEntries } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('mode', 'training')
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
  }, [searchingForOpponent, userId]);

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
      
      // Add to matchmaking queue
      const { error } = await supabase
        .from('matchmaking_queue')
        .insert({
          user_id: userId,
          mode: 'training',
          time_control: 10,
          time_increment: 0,
        });

      if (error) throw error;

      toast.info('Searching for opponent...');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2">AI Coach Training</h2>
          <p className="text-muted-foreground">
            {gameMode === 'solo' && 'Play both sides and receive instant AI analysis on every move'}
            {gameMode === 'friend' && 'Play against a random opponent - both players get AI feedback separately'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleReset}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Board
        </Button>
      </div>

      {/* Game Mode Selector */}
      <Card className="gradient-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant={gameMode === 'solo' ? 'default' : 'outline'}
              onClick={() => handleModeChange('solo')}
              className="flex-1 flex items-center gap-2 justify-center"
            >
              <User className="w-4 h-4" />
              Solo Practice
            </Button>
            <Button
              variant={gameMode === 'friend' ? 'default' : 'outline'}
              onClick={() => handleModeChange('friend')}
              className="flex-1 flex items-center gap-2 justify-center"
              disabled={searchingForOpponent}
            >
              <Users className="w-4 h-4" />
              Find Opponent
            </Button>
          </div>
          {searchingForOpponent && (
            <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching for opponent...</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={cancelTrainingMatchmaking}
                className="ml-2"
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Control Selector */}
      <Card className="gradient-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Time Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {TIME_CONTROLS.map((tc) => (
              <Button
                key={tc.label}
                variant={selectedTimeControl.label === tc.label ? 'default' : 'outline'}
                onClick={() => handleTimeControlChange(tc)}
                className="text-sm"
                disabled={gameMode === 'friend' && sessionId !== null}
              >
                {tc.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Friend Invite Dialog - REMOVED */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chessboard */}
        <div className="lg:col-span-2">
          <Card className="gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Practice Board</span>
                <Badge variant="outline" className="font-mono text-xs">
                  Move {moveCount}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Opponent Info and Actions */}
              {gameMode === 'friend' && opponentInfo && (
                <>
                  <div className="mb-4 p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {opponentInfo.display_name || opponentInfo.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{opponentInfo.username}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">
                        {opponentInfo.rating || 1200}
                      </p>
                      <p className="text-xs text-muted-foreground">Rating</p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="mb-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResign}
                      className="flex-1 flex items-center gap-2"
                    >
                      <Flag className="w-4 h-4" />
                      Resign
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleChallengeToRealGame}
                      className="flex-1 flex items-center gap-2"
                    >
                      <Swords className="w-4 h-4" />
                      Challenge to Real Game
                    </Button>
                  </div>
                </>
              )}

              {/* Timer */}
              {gameMode === 'friend' && sessionId && (
                <div className="mb-4">
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

              <div className="w-full max-w-2xl mx-auto">
                <ChessBoardComponent
                  position={position}
                  onMove={handleMove}
                  playerColor={gameMode === 'friend' ? playerColor : 'white'}
                  disabled={gameMode === 'friend' && chess.turn() !== playerColor.charAt(0)}
                  chess={chess}
                />
              </div>
              
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {chess.isCheckmate() ? (
                  <span className="text-destructive font-semibold">Checkmate!</span>
                ) : chess.isCheck() ? (
                  <span className="text-yellow-500 font-semibold">Check!</span>
                ) : chess.isDraw() ? (
                  <span className="text-muted-foreground font-semibold">Draw</span>
                ) : (
                  <span>
                    {chess.turn() === 'w' ? 'White' : 'Black'} to move
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Analysis Panel */}
        <div className="lg:col-span-1">
          <Card className="gradient-card border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Instant Analysis
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isAnalyzing ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Analyzing...</span>
                </div>
              ) : analysis ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge className={getMoveTypeColor(analysis.type)}>
                      {getMoveTypeIcon(analysis.type)}
                      <span className="ml-1 capitalize">{analysis.type}</span>
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        Position Evaluation
                      </p>
                      <p className="text-sm">{analysis.evaluation}</p>
                    </div>

                    {analysis.type !== "good" && (
                      <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                        <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" />
                          Better Move
                        </p>
                        <p className="text-sm">{analysis.suggestion}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        Explanation
                      </p>
                      <p className="text-sm text-muted-foreground">{analysis.explanation}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Make a move to receive instant AI feedback and analysis
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Heatmap */}
          {(gameMode === 'friend' && sessionId) && (
            <div className="mt-4">
              <TrainingHeatmap moveStats={moveStats} isHost={isHost} />
            </div>
          )}

          {/* Instructions Card */}
          <Card className="gradient-card mt-4">
            <CardHeader>
              <CardTitle className="text-base">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {gameMode === 'solo' && (
                <>
                  <p>• Play moves for both sides</p>
                  <p>• AI analyzes each move instantly</p>
                  <p>• Practice different positions</p>
                </>
              )}
              {gameMode === 'friend' && (
                <>
                  <p>• Take turns with your opponent</p>
                  <p>• Each player gets AI feedback</p>
                  <p>• Learn together from analysis</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
