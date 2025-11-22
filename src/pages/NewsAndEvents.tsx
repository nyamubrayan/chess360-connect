import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CommunityBar } from '@/components/CommunityBar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Users, Clock, Eye, Newspaper, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  author_id: string;
  published_at: string;
  category: string;
  image_url: string | null;
  views_count: number;
  author?: {
    display_name: string;
    username: string;
  };
}

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string | null;
  organizer_id: string;
  max_participants: number | null;
  registration_deadline: string | null;
  image_url: string | null;
  status: string;
  organizer?: {
    display_name: string;
    username: string;
  };
  participants_count?: number;
  is_registered?: boolean;
}

export default function NewsAndEvents() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    fetchNewsAndEvents();
  }, []);

  const fetchNewsAndEvents = async () => {
    try {
      // Fetch news articles with author info
      const { data: newsData, error: newsError } = await supabase
        .from('news_articles')
        .select(`
          *,
          author:profiles(display_name, username)
        `)
        .order('published_at', { ascending: false })
        .limit(20);

      if (newsError) throw newsError;

      // Fetch events with organizer info and participant counts
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          organizer:profiles(display_name, username),
          event_participants(count)
        `)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(20);

      if (eventsError) throw eventsError;

      // Check which events the user is registered for
      if (user && eventsData) {
        const eventIds = eventsData.map(e => e.id);
        const { data: registrations } = await supabase
          .from('event_participants')
          .select('event_id')
          .eq('user_id', user.id)
          .in('event_id', eventIds);

        const registeredEventIds = new Set(registrations?.map(r => r.event_id) || []);

        setEvents(eventsData.map(event => ({
          ...event,
          participants_count: event.event_participants?.[0]?.count || 0,
          is_registered: registeredEventIds.has(event.id)
        })));
      } else {
        setEvents(eventsData?.map(event => ({
          ...event,
          participants_count: event.event_participants?.[0]?.count || 0,
          is_registered: false
        })) || []);
      }

      setNews(newsData || []);
    } catch (error) {
      console.error('Error fetching news and events:', error);
      toast.error('Failed to load news and events');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const { error } = await supabase
        .from('event_participants')
        .insert({ event_id: eventId, user_id: user.id });

      if (error) throw error;

      toast.success('Successfully registered for event!');
      fetchNewsAndEvents();
    } catch (error: any) {
      console.error('Error joining event:', error);
      toast.error('Failed to register for event');
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Successfully unregistered from event');
      fetchNewsAndEvents();
    } catch (error: any) {
      console.error('Error leaving event:', error);
      toast.error('Failed to unregister from event');
    }
  };

  const handleFetchLatestNews = async () => {
    try {
      setLoading(true);
      toast.info('Fetching latest chess news...');
      
      const { data, error } = await supabase.functions.invoke('fetch-chess-news');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Successfully added ${data.count} new articles!`);
        fetchNewsAndEvents();
      } else {
        toast.info(data?.message || 'No new articles found');
      }
    } catch (error: any) {
      console.error('Error fetching news:', error);
      toast.error('Failed to fetch latest news');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CommunityBar user={user} />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">News & Events</h1>
              <p className="text-muted-foreground">
                Stay updated with the latest chess news and upcoming community events
              </p>
            </div>
            {user && (
              <Button
                onClick={handleFetchLatestNews}
                disabled={loading}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Update News</span>
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="news" className="w-full">
          <TabsList className="w-full sm:w-auto mb-6">
            <TabsTrigger value="news" className="flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              News
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Events
            </TabsTrigger>
          </TabsList>

          {/* News Tab */}
          <TabsContent value="news">
            {loading ? (
              <div className="grid gap-6">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                    <div className="h-4 bg-muted rounded w-full mb-2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </Card>
                ))}
              </div>
            ) : news.length === 0 ? (
              <Card className="p-12 text-center">
                <Newspaper className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No news articles yet</h3>
                <p className="text-muted-foreground">Check back later for updates!</p>
              </Card>
            ) : (
              <div className="grid gap-6">
                {news.map(article => (
                  <Card key={article.id} className="gradient-card overflow-hidden hover:glow-primary transition-all">
                    {article.image_url && (
                      <div className="w-full h-48 overflow-hidden">
                        <img 
                          src={article.image_url} 
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                          {article.category}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(article.published_at), 'MMM dd, yyyy')}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                          <Eye className="w-3 h-3" />
                          {article.views_count} views
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{article.title}</h3>
                      <p className="text-muted-foreground mb-4 line-clamp-3">
                        {article.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          By {article.author?.display_name || article.author?.username || 'Anonymous'}
                        </span>
                        <Button variant="secondary" size="sm">
                          Read More
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                    <div className="h-4 bg-muted rounded w-full mb-2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </Card>
                ))}
              </div>
            ) : events.length === 0 ? (
              <Card className="p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No upcoming events</h3>
                <p className="text-muted-foreground">Check back later for new events!</p>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {events.map(event => (
                  <Card key={event.id} className="gradient-card overflow-hidden hover:glow-primary transition-all">
                    {event.image_url && (
                      <div className="w-full h-40 overflow-hidden">
                        <img 
                          src={event.image_url} 
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground font-medium capitalize">
                          {event.status}
                        </span>
                        {event.max_participants && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                            <Users className="w-3 h-3" />
                            {event.participants_count}/{event.max_participants}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {event.description}
                      </p>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(event.event_date), 'PPP p')}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          By {event.organizer?.display_name || event.organizer?.username || 'Anonymous'}
                        </span>
                        {user ? (
                          event.is_registered ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleLeaveEvent(event.id)}
                            >
                              Unregister
                            </Button>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => handleJoinEvent(event.id)}
                              disabled={event.max_participants !== null && event.participants_count >= event.max_participants}
                            >
                              {event.max_participants !== null && event.participants_count >= event.max_participants 
                                ? 'Full' 
                                : 'Register'}
                            </Button>
                          )
                        ) : (
                          <Button 
                            size="sm"
                            onClick={() => navigate('/auth')}
                          >
                            Sign In to Register
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
