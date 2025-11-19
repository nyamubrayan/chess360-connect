import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GameChatProps {
  gameId: string;
  currentUserId: string;
  whitePlayer: any;
  blackPlayer: any;
  className?: string;
}

interface ChatMessage {
  id: string;
  game_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export const GameChat = ({
  gameId,
  currentUserId,
  whitePlayer,
  blackPlayer,
  className,
}: GameChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`game-chat-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_chat_messages',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('game_chat_messages')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const { error } = await supabase
      .from('game_chat_messages')
      .insert({
        game_id: gameId,
        user_id: currentUserId,
        message: newMessage.trim(),
      });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return;
    }

    setNewMessage('');
  };

  const getPlayerName = (userId: string) => {
    if (userId === whitePlayer?.id) return whitePlayer.username;
    if (userId === blackPlayer?.id) return blackPlayer.username;
    return 'Unknown';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className={`gradient-card p-4 flex flex-col ${className}`}>
      <h3 className="text-lg font-bold mb-3">Chat</h3>
      
      <ScrollArea className="flex-1 h-[300px] mb-3 pr-4" ref={scrollRef}>
        <div className="space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No messages yet. Start chatting!
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded ${
                  msg.user_id === currentUserId
                    ? 'bg-primary/20 ml-8'
                    : 'bg-accent/50 mr-8'
                }`}
              >
                <p className="text-xs font-semibold text-primary mb-1">
                  {getPlayerName(msg.user_id)}
                </p>
                <p className="text-sm break-words">{msg.message}</p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1"
          maxLength={200}
        />
        <Button
          onClick={handleSendMessage}
          size="icon"
          disabled={!newMessage.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};
