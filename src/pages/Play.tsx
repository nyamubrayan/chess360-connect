import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Users, Brain } from "lucide-react";
import ChessClock from "@/components/ChessClock";
import { AIMentorPanel } from "@/components/AIMentorPanel";
import { PostGameSummary } from "@/components/PostGameSummary";
import { NotificationBell } from "@/components/NotificationBell";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const Play = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [playerColor, setPlayerColor] = useState<"white" | "black" | null>(null);
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [isGameActive, setIsGameActive] = useState(false);
  const [aiMentorEnabled, setAiMentorEnabled] = useState(false);
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [completedGameId, setCompletedGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      navigate("/lobby");
      return;
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
    });

    fetchRoom();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          handleRoomUpdate(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (!isGameActive) return;

    const interval = setInterval(() => {
      const isWhiteTurn = game.turn() === "w";
      
      if (isWhiteTurn) {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            handleTimeout("white");
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            handleTimeout("black");
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameActive, game]);

  const handleTimeout = async (color: string) => {
    setIsGameActive(false);
    toast.error(`${color === "white" ? "White" : "Black"} ran out of time!`);
    
    await supabase
      .from("rooms")
      .update({ game_status: "completed" })
      .eq("id", roomId);

    await saveGameHistory("timeout", color === "white" ? room?.black_player_id : room?.white_player_id);
  };

  const handleResign = async () => {
    if (!playerColor) return;
    
    setIsGameActive(false);
    const winnerId = playerColor === "white" ? room?.black_player_id : room?.white_player_id;
    
    toast.success(`${playerColor === "white" ? "White" : "Black"} resigned. ${playerColor === "white" ? "Black" : "White"} wins!`);
    
    await supabase
      .from("rooms")
      .update({ game_status: "completed" })
      .eq("id", roomId);

    await saveGameHistory(playerColor === "white" ? "black_win" : "white_win", winnerId);
  };

  const handleOfferDraw = async () => {
    if (!playerColor) return;
    
    const confirmed = window.confirm("Offer a draw to your opponent?");
    if (!confirmed) return;

    toast.info("Draw offer sent to opponent");
    
    // In a real implementation, you would send this via realtime
    // For now, we'll just complete the game as a draw
    const acceptDraw = window.confirm("Your opponent has offered a draw. Do you accept?");
    
    if (acceptDraw) {
      setIsGameActive(false);
      toast.success("Game drawn by agreement");
      
      await supabase
        .from("rooms")
        .update({ game_status: "completed" })
        .eq("id", roomId);

      await saveGameHistory("draw", null);
    } else {
      toast.info("Draw offer declined");
    }
  };

  const saveGameHistory = async (result: string, winnerId: string | null = null) => {
    if (!room || !roomId) return;

    try {
      // Generate PGN from move history
      const pgn = moveHistory.join(" ");
      
      const { error } = await supabase.from("game_history").insert({
        room_id: roomId,
        white_player_id: room.white_player_id,
        black_player_id: room.black_player_id,
        winner_id: winnerId,
        result: result,
        moves_pgn: pgn,
        total_moves: moveHistory.length,
        time_control: room.time_control,
        game_duration: Math.floor((Date.now() - new Date(room.last_move_at || room.created_at).getTime()) / 1000),
      });

      if (error) {
        console.error("Error saving game history:", error);
        return;
      }

      // Get the saved game ID
      const { data: savedGame } = await supabase
        .from("game_history")
        .select("id")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (savedGame) {
        setCompletedGameId(savedGame.id);
        setShowSummary(true);
      }

      // Update player stats for both players
      if (room.white_player_id) {
        await supabase.rpc("update_player_stats", { p_user_id: room.white_player_id });
      }
      if (room.black_player_id) {
        await supabase.rpc("update_player_stats", { p_user_id: room.black_player_id });
      }
    } catch (error) {
      console.error("Error in saveGameHistory:", error);
    }
  };

  const fetchRoom = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (error) {
      console.error("Error fetching room:", error);
      toast.error("Failed to load game");
      navigate("/lobby");
      return;
    }

    handleRoomUpdate(data);
  };

  const handleRoomUpdate = async (roomData: any) => {
    setRoom(roomData);
    
    if (roomData.current_fen) {
      setGame(new Chess(roomData.current_fen));
    }

    setWhiteTime(roomData.white_time_remaining || roomData.time_control * 60);
    setBlackTime(roomData.black_time_remaining || roomData.time_control * 60);

    if (!user) return;

    // Assign colors
    if (roomData.white_player_id === user.id) {
      setPlayerColor("white");
    } else if (roomData.black_player_id === user.id) {
      setPlayerColor("black");
    } else if (!roomData.white_player_id) {
      await supabase
        .from("rooms")
        .update({ white_player_id: user.id })
        .eq("id", roomId);
      setPlayerColor("white");
    } else if (!roomData.black_player_id) {
      await supabase
        .from("rooms")
        .update({ 
          black_player_id: user.id,
          game_status: "active",
          last_move_at: new Date().toISOString()
        })
        .eq("id", roomId);
      
      // Add to room members
      await supabase
        .from("room_members")
        .insert({ room_id: roomId, user_id: user.id });
      
      // Notify white player that opponent joined
      if (roomData.white_player_id) {
        await supabase.from("notifications").insert({
          user_id: roomData.white_player_id,
          type: "game_started",
          title: "Opponent Joined!",
          message: "Your chess game is starting now!",
          room_id: roomId,
          sender_id: user.id,
        });
      }
      
      setPlayerColor("black");
      setIsGameActive(true);
      toast.success("Joined as black player! Game starting...");
    }
  };

  const makeAMove = async (move: { from: string; to: string; promotion?: string }) => {
    if (!isGameActive && room?.game_status === "active") {
      setIsGameActive(true);
    }

    // Check if it's the player's turn
    const isWhiteTurn = game.turn() === "w";
    if ((isWhiteTurn && playerColor !== "white") || (!isWhiteTurn && playerColor !== "black")) {
      toast.error("Not your turn!");
      return null;
    }

    try {
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);

      if (!result) {
        toast.error("Invalid move!");
        return null;
      }

      setGame(gameCopy);
      setMoveHistory([...moveHistory, result.san]);
      setLastMove(result.san);

      // Add time increment
      const increment = room?.time_increment || 0;
      if (isWhiteTurn) {
        setWhiteTime((prev) => prev + increment);
      } else {
        setBlackTime((prev) => prev + increment);
      }

      // Update room in database
      await supabase
        .from("rooms")
        .update({
          current_fen: gameCopy.fen(),
          white_time_remaining: whiteTime + (isWhiteTurn ? increment : 0),
          black_time_remaining: blackTime + (!isWhiteTurn ? increment : 0),
          last_move_at: new Date().toISOString(),
        })
        .eq("id", roomId);

      // Notify opponent that it's their turn
      const opponentId = isWhiteTurn ? room.black_player_id : room.white_player_id;
      if (opponentId) {
        await supabase.from("notifications").insert({
          user_id: opponentId,
          type: "your_turn",
          title: "Your Turn!",
          message: `It's your turn in the chess game. Move: ${result.san}`,
          room_id: roomId,
          sender_id: user?.id,
        });
      }

      if (gameCopy.isCheckmate()) {
        toast.success(`Checkmate! ${isWhiteTurn ? "White" : "Black"} wins!`);
        setIsGameActive(false);
        const winnerId = isWhiteTurn ? room.white_player_id : room.black_player_id;
        await supabase
          .from("rooms")
          .update({ game_status: "completed" })
          .eq("id", roomId);
        await saveGameHistory(isWhiteTurn ? "white_win" : "black_win", winnerId);
      } else if (gameCopy.isCheck()) {
        toast("Check!");
      } else if (gameCopy.isDraw()) {
        toast("Game drawn!");
        setIsGameActive(false);
        await supabase
          .from("rooms")
          .update({ game_status: "completed" })
          .eq("id", roomId);
        await saveGameHistory("draw", null);
      }

      return result;
    } catch (error) {
      toast.error("Invalid move!");
      return null;
    }
  };

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    return move !== null;
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="gradient-card p-6">
          <p className="text-muted-foreground">Loading game...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="secondary" onClick={() => navigate("/lobby")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Lobby
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold">{room.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Playing as {playerColor || "spectator"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user && <NotificationBell userId={user.id} />}
            <div className="text-right text-sm">
              <div className="flex items-center gap-2 justify-end">
                <Users className="w-4 h-4" />
                <span>{room.member_count || 1}/2 players</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="gradient-card p-6 glow-primary">
              <div className="aspect-square max-w-2xl mx-auto">
                <Chessboard
                  boardWidth={600}
                  position={game.fen()}
                  onPieceDrop={onDrop}
                  boardOrientation={playerColor || "white"}
                />
              </div>
              
              {room.game_status === "waiting" && (
                <div className="mt-6 text-center">
                  <p className="text-muted-foreground">
                    Waiting for opponent to join...
                  </p>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <ChessClock
              whiteTime={whiteTime}
              blackTime={blackTime}
              isWhiteTurn={game.turn() === "w"}
              isActive={isGameActive && room.game_status === "active"}
            />

            <Card className="gradient-card p-6">
              <h3 className="text-xl font-bold mb-4">Move History</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {moveHistory.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No moves yet</p>
                ) : (
                  moveHistory.map((move, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 text-sm py-2 px-3 rounded bg-muted/30"
                    >
                      <span className="text-muted-foreground font-mono">
                        {Math.floor(index / 2) + 1}.
                      </span>
                      <span className="font-medium">{move}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="gradient-card p-6">
              <h3 className="text-xl font-bold mb-4">Game Status</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{room.game_status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Turn</span>
                  <span className="font-medium">
                    {game.turn() === "w" ? "White" : "Black"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Moves</span>
                  <span className="font-medium">{moveHistory.length}</span>
                </div>
              </div>
              
              {room.game_status === "active" && playerColor && (
                <div className="mt-6 space-y-2">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleResign}
                  >
                    Resign
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleOfferDraw}
                  >
                    Offer Draw
                  </Button>
                </div>
              )}
            </Card>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <Label htmlFor="ai-mentor" className="cursor-pointer">
                  AI Mentor Mode
                </Label>
              </div>
              <Switch
                id="ai-mentor"
                checked={aiMentorEnabled}
                onCheckedChange={setAiMentorEnabled}
              />
            </div>

            {aiMentorEnabled && (
              <AIMentorPanel
                currentFen={game.fen()}
                lastMove={lastMove}
                playerColor={playerColor}
                isActive={aiMentorEnabled && isGameActive}
              />
            )}
          </div>
        </div>
      </div>

      {completedGameId && playerColor && (
        <PostGameSummary
          open={showSummary}
          onOpenChange={setShowSummary}
          gameId={completedGameId}
          result={room?.game_status === "completed" ? "draw" : "unknown"}
          playerColor={playerColor}
        />
      )}
    </div>
  );
};

export default Play;
