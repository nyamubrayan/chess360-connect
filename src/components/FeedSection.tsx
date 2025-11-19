import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Heart, MessageCircle, Share2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GameHighlightPlayer } from './GameHighlightPlayer';

interface Post {
  id: string;
  title: string;
  content: string;
  category: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    display_name: string | null;
  };
}

interface Highlight {
  id: string;
  game_id: string;
  title: string;
  description: string;
  key_moments: any;
  duration: number;
  views_count: number;
  likes_count: number;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    display_name: string | null;
  };
}

export const FeedSection = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'highlights'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      // Fetch recent posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, avatar_url, display_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (postsError) throw postsError;

      // Fetch recent highlights
      const { data: highlightsData, error: highlightsError } = await supabase
        .from('game_highlights')
        .select(`
          *,
          profiles:user_id (username, avatar_url, display_name)
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (highlightsError) throw highlightsError;

      setPosts(postsData || []);
      setHighlights(highlightsData || []);
    } catch (error) {
      console.error('Error fetching feed:', error);
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to like posts');
        return;
      }

      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id });

      if (error) throw error;
      toast.success('Post liked!');
      fetchFeed();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const displayPosts = activeTab === 'highlights' ? [] : posts;
  const displayHighlights = activeTab === 'posts' ? [] : highlights;

  return (
    <section className="py-8 px-4 bg-background">
      <div className="container mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Community Feed
          </h2>
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('all')}
            >
              All
            </Button>
            <Button
              variant={activeTab === 'posts' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('posts')}
            >
              Posts
            </Button>
            <Button
              variant={activeTab === 'highlights' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('highlights')}
            >
              Highlights
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Highlights */}
          {displayHighlights.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {displayHighlights.map((highlight) => (
                <div key={highlight.id}>
                  <GameHighlightPlayer
                    highlightId={highlight.id}
                    title={highlight.title}
                    description={highlight.description}
                    keyMoments={Array.isArray(highlight.key_moments) ? highlight.key_moments : []}
                    duration={highlight.duration}
                  />
                  <div className="flex items-center gap-2 mt-2 px-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={highlight.profiles?.avatar_url || ''} />
                      <AvatarFallback>{highlight.profiles?.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {highlight.profiles?.display_name || highlight.profiles?.username}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Posts */}
          {displayPosts.map((post) => (
            <Card
              key={post.id}
              className="p-6 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate('/community')}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={post.profiles?.avatar_url || ''} />
                      <AvatarFallback>{post.profiles?.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">
                        {post.profiles?.display_name || post.profiles?.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {post.category && (
                    <Badge variant="secondary">{post.category}</Badge>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-2">{post.title}</h3>
                  <p className="text-muted-foreground line-clamp-3">{post.content}</p>
                </div>

                <div className="flex items-center gap-4 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLikePost(post.id);
                    }}
                    className="gap-2"
                  >
                    <Heart className="w-4 h-4" />
                    {post.likes_count || 0}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <MessageCircle className="w-4 h-4" />
                    {post.comments_count || 0}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {displayPosts.length === 0 && displayHighlights.length === 0 && (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No posts yet. Be the first to share!</p>
              <Button onClick={() => navigate('/community')}>
                Go to Community
              </Button>
            </Card>
          )}
        </div>

        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => navigate('/community')}
            className="w-full sm:w-auto"
          >
            View All in Community
          </Button>
        </div>
      </div>
    </section>
  );
};
