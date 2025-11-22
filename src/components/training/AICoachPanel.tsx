import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { ChessBoardComponent } from '@/components/chess/ChessBoard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Lightbulb, TrendingUp, AlertCircle, Loader2, RotateCcw, User, Users, Bot, Send } from 'lucide-react';
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

type GameMode = 'solo' | 'friend' | 'computer';

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

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  // Fetch friends when dialog opens
  useEffect(() => {
    if (inviteDialogOpen && userId) {
      fetchFriends();
    }
  }, [inviteDialogOpen, userId]);

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
          if (session.status === 'active' && waitingForFriend) {
            setWaitingForFriend(false);
            toast.success('Friend joined! Training started.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameMode, sessionId, position, waitingForFriend]);

  const fetchFriends = async () => {
    if (!userId) return;

    const { data: sentFriends } = await supabase
      .from("friends")
      .select('id, friend_id')
      .eq("user_id", userId)
      .eq("status", "accepted");

    const { data: receivedFriends } = await supabase
      .from("friends")
      .select('id, user_id')
      .eq("friend_id", userId)
      .eq("status", "accepted");

    const friendIds = [
      ...(sentFriends || []).map(f => f.friend_id),
      ...(receivedFriends || []).map(f => f.user_id)
    ];

    if (friendIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', friendIds);

      const friendsWithProfiles = [
        ...(sentFriends || []).map(friend => ({
          ...friend,
          profiles: profilesData?.find(p => p.id === friend.friend_id) || {}
        })),
        ...(receivedFriends || []).map(friend => ({
          id: friend.id,
          friend_id: friend.user_id,
          profiles: profilesData?.find(p => p.id === friend.user_id) || {}
        }))
      ];

      setFriends(friendsWithProfiles as any);
    }
  };

  const inviteFriend = async (friendId: string, friendUsername: string) => {
    if (!userId) return;

    try {
      // Create training session
      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .insert({
          host_player_id: userId,
          guest_player_id: friendId,
          status: 'waiting',
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Send notification
      await supabase.from('notifications').insert({
        user_id: friendId,
        sender_id: userId,
        room_id: session.id,
        type: 'training_invite',
        title: 'AI Coach Training Invitation',
        message: 'invited you to a training session!',
      });

      setSessionId(session.id);
      setIsHost(true);
      setWaitingForFriend(true);
      setInviteDialogOpen(false);
      toast.success(`Invitation sent to ${friendUsername}!`);
    } catch (error) {
      console.error('Error inviting friend:', error);
      toast.error('Failed to send invitation');
    }
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
    } catch (error: any) {
      console.error('Error analyzing move:', error);
      toast.error('Failed to analyze move. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const makeComputerMove = async () => {
    const moves = chess.moves();
    if (moves.length === 0) return;
    
    // Make a random legal move
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    const move = chess.move(randomMove);
    
    if (move) {
      const newPosition = chess.fen();
      setPosition(newPosition);
      setLastMove(`${move.from}${move.to}`);
      setMoveCount(prev => prev + 1);
    }
  };

  const handleMove = async (from: string, to: string) => {
    try {
      const move = chess.move({ from, to, promotion: 'q' });
      
      if (move) {
        const newPosition = chess.fen();
        setPosition(newPosition);
        setLastMove(`${move.from}${move.to}`);
        
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
        
        // Analyze the move for the player who made it
        await analyzeMoveInRealTime(move.san);

        // If playing against computer and it's computer's turn
        if (gameMode === 'computer' && chess.turn() !== playerColor.charAt(0)) {
          setTimeout(async () => {
            await makeComputerMove();
          }, 500);
        }
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
    
    // Update session if in friend mode
    if (gameMode === 'friend' && sessionId) {
      await supabase
        .from('training_sessions')
        .update({
          current_fen: startingFen,
          move_count: 0,
          last_move: null,
        })
        .eq('id', sessionId);
    }
    
    toast.success('Board reset');
  };

  const handleModeChange = async (mode: GameMode) => {
    // Clean up existing session
    if (sessionId && gameMode === 'friend') {
      await supabase
        .from('training_sessions')
        .delete()
        .eq('id', sessionId);
    }
    
    setSessionId(null);
    setWaitingForFriend(false);
    setGameMode(mode);
    await handleReset();
    
    if (mode === 'computer') {
      setPlayerColor(Math.random() > 0.5 ? 'white' : 'black');
    } else if (mode === 'friend') {
      setInviteDialogOpen(true);
    }
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
            {gameMode === 'friend' && 'Play with a friend - both players get AI feedback separately'}
            {gameMode === 'computer' && 'Play against computer and get AI feedback on your moves'}
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
            >
              <Users className="w-4 h-4" />
              Play with Friend
            </Button>
            <Button
              variant={gameMode === 'computer' ? 'default' : 'outline'}
              onClick={() => handleModeChange('computer')}
              className="flex-1 flex items-center gap-2 justify-center"
            >
              <Bot className="w-4 h-4" />
              Play vs Computer
            </Button>
          </div>
          {waitingForFriend && (
            <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for friend to join...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Friend Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Friend to Training</DialogTitle>
            <DialogDescription>
              Select a friend to practice with. You'll both receive separate AI feedback.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {friends.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No friends available. Add friends first!
              </p>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 p-3 rounded bg-muted/30"
                  >
                    <Avatar>
                      <AvatarImage src={friend.profiles.avatar_url || undefined} />
                      <AvatarFallback>
                        {friend.profiles.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {friend.profiles.display_name || friend.profiles.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{friend.profiles.username}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => inviteFriend(friend.friend_id, friend.profiles.username)}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Invite
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

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
              <div className="w-full max-w-2xl mx-auto">
                <ChessBoardComponent
                  position={position}
                  onMove={handleMove}
                  playerColor={gameMode === 'computer' ? playerColor : 'white'}
                  disabled={gameMode === 'computer' && chess.turn() !== playerColor.charAt(0)}
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
                  <p>• Take turns with your friend</p>
                  <p>• Each player gets AI feedback</p>
                  <p>• Learn together from analysis</p>
                </>
              )}
              {gameMode === 'computer' && (
                <>
                  <p>• Play as {playerColor}</p>
                  <p>• Computer makes moves for opponent</p>
                  <p>• Get AI feedback on your moves</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
