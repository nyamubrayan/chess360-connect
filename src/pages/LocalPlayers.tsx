import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Users, Calendar, Trophy, Navigation, Settings } from "lucide-react";
import { toast } from "sonner";
import LocationSettingsDialog from "@/components/LocationSettingsDialog";
import CreateEventDialog from "@/components/CreateEventDialog";

interface NearbyPlayer {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  rating: number;
  distance: number;
  city: string | null;
  country: string | null;
}

interface LocalEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
  location_name: string | null;
  city: string | null;
  country: string | null;
  max_participants: number | null;
  current_participants: number;
  distance: number;
  organizer: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function LocalPlayers() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([]);
  const [localEvents, setLocalEvents] = useState<LocalEvent[]>([]);
  const [showLocationSettings, setShowLocationSettings] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    await checkLocationStatus(user.id);
    setLoading(false);
  };

  const checkLocationStatus = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("location_enabled, latitude, longitude")
      .eq("id", userId)
      .single();

    if (profile?.location_enabled && profile.latitude && profile.longitude) {
      setLocationEnabled(true);
      await fetchNearbyPlayers(profile.latitude, profile.longitude);
      await fetchLocalEvents(profile.latitude, profile.longitude);
    }
  };

  const fetchNearbyPlayers = async (userLat: number, userLon: number) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, rating, latitude, longitude, city, country")
      .eq("location_enabled", true)
      .neq("id", user?.id);

    if (error) {
      console.error("Error fetching nearby players:", error);
      return;
    }

    if (data) {
      const playersWithDistance = data
        .filter(p => p.latitude && p.longitude)
        .map(player => {
          const R = 6371; // Earth's radius in km
          const dLat = (player.latitude! - userLat) * Math.PI / 180;
          const dLon = (player.longitude! - userLon) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(userLat * Math.PI / 180) * Math.cos(player.latitude! * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          
          return { ...player, distance };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20);

      setNearbyPlayers(playersWithDistance as NearbyPlayer[]);
    }
  };

  const fetchLocalEvents = async (userLat: number, userLon: number) => {
    const { data, error } = await supabase
      .from("local_events")
      .select(`
        *,
        organizer:organizer_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("status", "upcoming")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error fetching local events:", error);
      return;
    }

    if (data) {
      const eventsWithDistance = data
        .map(event => {
          const R = 6371;
          const dLat = (event.latitude - userLat) * Math.PI / 180;
          const dLon = (event.longitude - userLon) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(userLat * Math.PI / 180) * Math.cos(event.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          
          return { ...event, distance };
        })
        .sort((a, b) => a.distance - b.distance);

      setLocalEvents(eventsWithDistance as LocalEvent[]);
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("event_participants")
      .insert({ event_id: eventId, user_id: user.id });

    if (error) {
      toast.error("Failed to join event");
      return;
    }

    toast.success("Successfully joined event!");
    const { data: profile } = await supabase
      .from("profiles")
      .select("latitude, longitude")
      .eq("id", user.id)
      .single();

    if (profile?.latitude && profile.longitude) {
      await fetchLocalEvents(profile.latitude, profile.longitude);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!locationEnabled) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-6 h-6" />
              Enable Location Services
            </CardTitle>
            <CardDescription>
              Find local chess players and events near you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              To discover nearby players and local chess events, please enable location services.
              Your location will be used to show you relevant players and events in your area.
            </p>
            <Button onClick={() => setShowLocationSettings(true)}>
              <Navigation className="w-4 h-4 mr-2" />
              Enable Location
            </Button>
          </CardContent>
        </Card>
        <LocationSettingsDialog 
          open={showLocationSettings} 
          onOpenChange={setShowLocationSettings}
          onLocationEnabled={() => {
            setLocationEnabled(true);
            checkLocationStatus(user.id);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Local Chess Community</h1>
          <p className="text-muted-foreground">Find players and events near you</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowLocationSettings(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Location Settings
          </Button>
          <Button onClick={() => setShowCreateEvent(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </div>
      </div>

      <Tabs defaultValue="players" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="players">
            <Users className="w-4 h-4 mr-2" />
            Nearby Players ({nearbyPlayers.length})
          </TabsTrigger>
          <TabsTrigger value="events">
            <Calendar className="w-4 h-4 mr-2" />
            Local Events ({localEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="space-y-4 mt-6">
          {nearbyPlayers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No players found nearby. Be the first in your area!
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {nearbyPlayers.map((player) => (
                <Card key={player.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={player.avatar_url || undefined} />
                        <AvatarFallback>{player.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {player.display_name || player.username}
                        </h3>
                        <p className="text-sm text-muted-foreground">@{player.username}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">
                            <Trophy className="w-3 h-3 mr-1" />
                            {player.rating}
                          </Badge>
                          <Badge variant="outline">
                            <MapPin className="w-3 h-3 mr-1" />
                            {player.distance.toFixed(1)} km
                          </Badge>
                        </div>
                        {player.city && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {player.city}, {player.country}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/profile/${player.id}`)}
                      >
                        View Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4 mt-6">
          {localEvents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No upcoming events nearby. Create one to get started!
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {localEvents.map((event) => (
                <Card key={event.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{event.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {event.description}
                        </CardDescription>
                      </div>
                      <Badge className="capitalize">{event.event_type.replace('_', ' ')}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{new Date(event.event_date).toLocaleDateString()} at {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{event.location_name || `${event.city}, ${event.country}`} • {event.distance.toFixed(1)} km away</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {event.current_participants} {event.max_participants ? `/ ${event.max_participants}` : ''} participants
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={event.organizer.avatar_url || undefined} />
                            <AvatarFallback>{event.organizer.username[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">
                            Organized by {event.organizer.display_name || event.organizer.username}
                          </span>
                        </div>
                        <Button onClick={() => handleJoinEvent(event.id)}>
                          Join Event
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <LocationSettingsDialog 
        open={showLocationSettings} 
        onOpenChange={setShowLocationSettings}
        onLocationEnabled={() => {
          setLocationEnabled(true);
          checkLocationStatus(user.id);
        }}
      />
      <CreateEventDialog
        open={showCreateEvent}
        onOpenChange={setShowCreateEvent}
        onEventCreated={() => {
          const profile = supabase
            .from("profiles")
            .select("latitude, longitude")
            .eq("id", user.id)
            .single();
          profile.then(({ data }) => {
            if (data?.latitude && data.longitude) {
              fetchLocalEvents(data.latitude, data.longitude);
            }
          });
        }}
      />
    </div>
  );
}
