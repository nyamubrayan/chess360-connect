import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  room_id: string | null;
  sender_id: string | null;
  read: boolean;
  created_at: string;
}

export const NotificationBell = ({ userId }: { userId: string }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          
          // Show toast for new notification
          toast.info(newNotification.title, {
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching notifications:", error);
      return;
    }

    setNotifications(data || []);
    setUnreadCount(data?.filter((n) => !n.read).length || 0);
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);

    // Handle rematch requests
    if (notification.type === 'rematch_request' && notification.sender_id) {
      try {
        // Fetch the original game to get time control settings
        const { data: originalGame } = await supabase
          .from('games')
          .select('time_control, time_increment')
          .eq('id', notification.room_id!)
          .single();

        if (!originalGame) {
          toast.error('Failed to load rematch details');
          return;
        }

        // Create new game with the same time control
        const isWhite = Math.random() < 0.5;
        const whitePlayerId = isWhite ? userId : notification.sender_id;
        const blackPlayerId = isWhite ? notification.sender_id : userId;
        const timeInSeconds = originalGame.time_control * 60;

        const { data: newGame, error: gameError } = await supabase
          .from('games')
          .insert({
            white_player_id: whitePlayerId,
            black_player_id: blackPlayerId,
            time_control: originalGame.time_control,
            time_increment: originalGame.time_increment,
            white_time_remaining: timeInSeconds,
            black_time_remaining: timeInSeconds,
            status: 'active',
            last_move_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (gameError) throw gameError;

        // Send notifications to both players
        await supabase.from('notifications').insert([
          {
            user_id: whitePlayerId,
            type: 'match_found',
            title: 'Rematch Started!',
            message: 'Your rematch has started. You are playing as White.',
            room_id: newGame.id,
          },
          {
            user_id: blackPlayerId,
            type: 'match_found',
            title: 'Rematch Started!',
            message: 'Your rematch has started. You are playing as Black.',
            room_id: newGame.id,
          },
        ]);

        toast.success('Rematch accepted! Starting game...');
        navigate(`/game/${newGame.id}`);
        setOpen(false);
        return;
      } catch (error) {
        console.error('Error creating rematch:', error);
        toast.error('Failed to start rematch');
        return;
      }
    }

    // Handle tournament invites
    if (notification.type === 'tournament_invite' && notification.room_id) {
      const tournamentId = notification.room_id;
      
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (!tournament) {
        toast.error("Tournament not found");
        setOpen(false);
        return;
      }

      if (tournament.status !== 'upcoming') {
        toast.error("Tournament has already started or ended");
        setOpen(false);
        return;
      }

      // Check if already joined
      const { data: existingParticipant } = await supabase
        .from('tournament_participants')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingParticipant) {
        toast.info("You've already joined this tournament");
        navigate(`/tournaments/${tournamentId}`);
        setOpen(false);
        return;
      }

      // Join the tournament
      const { error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournamentId,
          user_id: userId,
          status: 'registered'
        });

      if (error) {
        toast.error("Failed to join tournament");
        console.error(error);
      } else {
        toast.success("Joined tournament successfully!");
      }

      navigate(`/tournaments/${tournamentId}`);
      setOpen(false);
      return;
    }

    // Handle game challenges
    if (notification.type === 'game_challenge' && notification.room_id) {
      navigate(`/game/${notification.room_id}`);
      setOpen(false);
      return;
    }

    // Handle other game notifications
    if (notification.room_id && (notification.type === 'match_found' || notification.type === 'game_started' || notification.type === 'your_turn')) {
      navigate(`/game/${notification.room_id}`);
      setOpen(false);
      return;
    }

    // Handle friend requests
    if (notification.type === 'friend_request') {
      // Just close the notification - user can manage in Friends dialog
      toast.info("Check your Friends list to accept the request");
      setOpen(false);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    
    if (unreadIds.length === 0) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "rematch_request":
        return "🔄";
      case "game_challenge":
        return "⚔️";
      case "game_invite":
        return "🎮";
      case "game_started":
        return "▶️";
      case "your_turn":
        return "⏰";
      case "friend_request":
        return "👤";
      case "tournament_invite":
        return "🏆";
      default:
        return "🔔";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                    !notification.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{notification.title}</p>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
