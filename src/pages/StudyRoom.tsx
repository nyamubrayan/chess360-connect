import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  message: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
  };
}

export default function StudyRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [room, setRoom] = useState<any>(null);
  const [game] = useState(new Chess());
  const [position, setPosition] = useState(game.fen());
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [participants, setParticipants] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;

    fetchRoomData();
    joinRoom();

    const roomChannel = supabase
      .channel(`study-room-${roomId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'study_rooms',
        filter: `id=eq.${roomId}`
      }, (payload) => {
        const newFen = payload.new.current_fen;
        game.load(newFen);
        setPosition(newFen);
      })
      .subscribe();

    const messagesChannel = supabase
      .channel(`study-room-messages-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'study_room_messages',
        filter: `room_id=eq.${roomId}`
      }, () => {
        fetchMessages();
      })
      .subscribe();

    const participantsChannel = supabase
      .channel(`study-room-participants-${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'study_room_participants',
        filter: `room_id=eq.${roomId}`
      }, () => {
        fetchParticipants();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchRoomData = async () => {
    const { data, error } = await supabase
      .from('study_rooms')
      .select('*, profiles:creator_id (username, display_name)')
      .eq('id', roomId)
      .single();

    if (error) {
      toast({ title: "Error loading room", description: error.message, variant: "destructive" });
      navigate('/study-rooms');
    } else {
      setRoom(data);
      game.load(data.current_fen);
      setPosition(data.current_fen);
    }

    fetchMessages();
    fetchParticipants();
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('study_room_messages')
      .select('*, profiles:user_id (username, display_name)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  };

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from('study_room_participants')
      .select('*, profiles:user_id (username, display_name, avatar_url)')
      .eq('room_id', roomId);

    if (data) setParticipants(data);
  };

  const joinRoom = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('study_room_participants')
      .insert([{ room_id: roomId, user_id: user.id }])
      .select();
  };

  const handleMove = (sourceSquare: string, targetSquare: string) => {
    try {
      const move = game.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      if (move) {
        const newFen = game.fen();
        setPosition(newFen);

        supabase
          .from('study_rooms')
          .update({ current_fen: newFen })
          .eq('id', roomId)
          .then();
        
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('study_room_messages')
      .insert([{ room_id: roomId, user_id: user.id, message: newMessage }]);

    if (error) {
      toast({ title: "Error sending message", description: error.message, variant: "destructive" });
    } else {
      setNewMessage("");
    }
  };

  if (!room) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/study-rooms')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rooms
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{room.name}</CardTitle>
              {room.description && (
                <p className="text-sm text-muted-foreground">{room.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="max-w-[600px] mx-auto">
                <Chessboard
                  position={position}
                  onPieceDrop={handleMove}
                  customBoardStyle={{
                    borderRadius: '4px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participants ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {p.profiles.display_name || p.profiles.username}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-[500px]">
            <CardHeader>
              <CardTitle>Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                      <p className="text-sm font-medium">
                        {msg.profiles.display_name || msg.profiles.username}
                      </p>
                      <p className="text-sm text-muted-foreground">{msg.message}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="flex gap-2 mt-4">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                />
                <Button size="icon" onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
