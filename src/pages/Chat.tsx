import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CommunityBar } from '@/components/CommunityBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface FriendProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function Chat() {
  const navigate = useNavigate();
  const { friendId } = useParams<{ friendId: string }>();
  const [user, setUser] = useState<any>(null);
  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
      loadChat(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate, friendId]);

  const loadChat = async (currentUserId: string) => {
    if (!friendId) return;

    try {
      setLoading(true);

      // Load friend profile
      const { data: friendData, error: friendError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', friendId)
        .single();

      if (friendError) throw friendError;
      setFriend(friendData);

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('private_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

      // Mark messages as read
      await supabase
        .from('private_messages')
        .update({ read: true })
        .eq('receiver_id', currentUserId)
        .eq('sender_id', friendId)
        .eq('read', false);

    } catch (error: any) {
      console.error('Error loading chat:', error);
      toast.error('Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !friendId) return;

    // Subscribe to new messages
    const channel = supabase
      .channel('private-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === friendId) {
            setMessages(prev => [...prev, newMsg]);
            // Mark as read
            supabase
              .from('private_messages')
              .update({ read: true })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, friendId]);

  const sendMessage = async () => {
    if (!user || !friendId || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('private_messages')
        .insert({
          sender_id: user.id,
          receiver_id: friendId,
          message: newMessage.trim()
        });

      if (error) throw error;

      // Send notification
      await supabase.from('notifications').insert({
        user_id: friendId,
        sender_id: user.id,
        type: 'new_message',
        title: 'New Message',
        message: `You have a new message from ${user.email}`
      });

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="gradient-card p-6">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CommunityBar user={user} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/connect')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Networking Zone
        </Button>

        <Card className="gradient-card">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={friend?.avatar_url || undefined} />
                <AvatarFallback>
                  {friend?.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl">
                {friend?.display_name || friend?.username}
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[500px] p-6">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_id === user.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.sender_id === user.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm break-words">{msg.message}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender_id === user.id
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border/50">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
