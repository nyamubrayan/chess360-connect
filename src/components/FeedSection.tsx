import { useEffect, useState, useRef, useCallback } from 'react';
import { Card } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Heart, MessageCircle, Share2, Sparkles, BookOpen, GraduationCap, PlayCircle, Star, TrendingUp, Users, Loader2 } from 'lucide-react';
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

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  difficulty_level: string | null;
  tags: string[] | null;
  views_count: number;
  lesson_type: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    display_name: string | null;
  };
}

interface Coach {
  id: string;
  user_id: string;
  bio: string | null;
  rating: number | null;
  total_students: number | null;
  specialties: string[] | null;
  hourly_rate: number | null;
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
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    display_name: string | null;
  };
}

type FeedTab = 'all' | 'posts' | 'lessons' | 'coaches' | 'reels';

export const FeedSection = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const [hasMore, setHasMore] = useState({
    posts: true,
    lessons: true,
    coaches: true,
    highlights: true
  });
  const [page, setPage] = useState({
    posts: 0,
    lessons: 0,
    coaches: 0,
    highlights: 0
  });
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async (append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const currentPage = append ? page : { posts: 0, lessons: 0, coaches: 0, highlights: 0 };
      
      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, avatar_url, display_name)
        `)
        .order('created_at', { ascending: false })
        .range(
          currentPage.posts * ITEMS_PER_PAGE,
          (currentPage.posts + 1) * ITEMS_PER_PAGE - 1
        );

      if (postsError) throw postsError;

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          *,
          profiles:coach_id (username, avatar_url, display_name)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(
          currentPage.lessons * ITEMS_PER_PAGE,
          (currentPage.lessons + 1) * ITEMS_PER_PAGE - 1
        );

      if (lessonsError) throw lessonsError;

      // Fetch coaches
      const { data: coachesData, error: coachesError } = await supabase
        .from('coach_profiles')
        .select(`
          *,
          profiles:user_id (username, avatar_url, display_name)
        `)
        .order('rating', { ascending: false })
        .range(
          currentPage.coaches * ITEMS_PER_PAGE,
          (currentPage.coaches + 1) * ITEMS_PER_PAGE - 1
        );

      if (coachesError) throw coachesError;

      // Fetch highlights
      const { data: highlightsData, error: highlightsError } = await supabase
        .from('game_highlights')
        .select(`
          *,
          profiles:user_id (username, avatar_url, display_name)
        `)
        .order('created_at', { ascending: false })
        .range(
          currentPage.highlights * ITEMS_PER_PAGE,
          (currentPage.highlights + 1) * ITEMS_PER_PAGE - 1
        );

      if (highlightsError) throw highlightsError;

      if (append) {
        setPosts(prev => [...prev, ...(postsData || [])]);
        setLessons(prev => [...prev, ...(lessonsData || [])]);
        setCoaches(prev => [...prev, ...(coachesData || [])]);
        setHighlights(prev => [...prev, ...(highlightsData || [])]);
      } else {
        setPosts(postsData || []);
        setLessons(lessonsData || []);
        setCoaches(coachesData || []);
        setHighlights(highlightsData || []);
      }

      // Update hasMore state
      setHasMore({
        posts: (postsData?.length || 0) === ITEMS_PER_PAGE,
        lessons: (lessonsData?.length || 0) === ITEMS_PER_PAGE,
        coaches: (coachesData?.length || 0) === ITEMS_PER_PAGE,
        highlights: (highlightsData?.length || 0) === ITEMS_PER_PAGE
      });

    } catch (error) {
      console.error('Error fetching feed:', error);
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (loadingMore) return;

    const hasAnyMore = 
      (activeTab === 'all' && (hasMore.posts || hasMore.lessons || hasMore.coaches || hasMore.highlights)) ||
      (activeTab === 'posts' && hasMore.posts) ||
      (activeTab === 'lessons' && hasMore.lessons) ||
      (activeTab === 'coaches' && hasMore.coaches) ||
      (activeTab === 'reels' && hasMore.highlights);

    if (!hasAnyMore) return;

    setPage(prev => ({
      posts: prev.posts + 1,
      lessons: prev.lessons + 1,
      coaches: prev.coaches + 1,
      highlights: prev.highlights + 1
    }));

    fetchFeed(true);
  }, [loadingMore, hasMore, activeTab]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loading, loadingMore, loadMore]);

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

  const tabs: { value: FeedTab; label: string; icon: any; count: number }[] = [
    { value: 'all', label: 'All', icon: Sparkles, count: posts.length + lessons.length + coaches.length + highlights.length },
    { value: 'posts', label: 'Posts', icon: MessageCircle, count: posts.length },
    { value: 'lessons', label: 'Lessons', icon: BookOpen, count: lessons.length },
    { value: 'coaches', label: 'Coaches', icon: GraduationCap, count: coaches.length },
    { value: 'reels', label: 'Reels', icon: PlayCircle, count: highlights.length },
  ];

  const shouldShowPosts = activeTab === 'all' || activeTab === 'posts';
  const shouldShowLessons = activeTab === 'all' || activeTab === 'lessons';
  const shouldShowCoaches = activeTab === 'all' || activeTab === 'coaches';
  const shouldShowReels = activeTab === 'all' || activeTab === 'reels';

  return (
    <section className="py-12 px-4 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3 text-gradient mb-2">
              <Sparkles className="w-8 h-8 text-primary" />
              Discover
            </h2>
            <p className="text-muted-foreground">Explore posts, lessons, coaches, and epic game moments</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.value}
                variant={activeTab === tab.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.value)}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <Badge variant="secondary" className="ml-1">
                  {tab.count}
                </Badge>
              </Button>
            );
          })}
        </div>

        <div className="space-y-8">
          {/* Reels/Highlights Section */}
          {shouldShowReels && highlights.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <PlayCircle className="w-5 h-5 text-accent" />
                <h3 className="text-xl font-bold">Epic Game Moments</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {highlights.map((highlight) => (
                  <Card key={highlight.id} className="overflow-hidden group hover:border-accent/50 transition-all">
                    <GameHighlightPlayer
                      highlightId={highlight.id}
                      title={highlight.title}
                      description={highlight.description}
                      keyMoments={Array.isArray(highlight.key_moments) ? highlight.key_moments : []}
                      duration={highlight.duration}
                    />
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                          <AvatarImage src={highlight.profiles?.avatar_url || ''} />
                          <AvatarFallback>{highlight.profiles?.username?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {highlight.profiles?.display_name || highlight.profiles?.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(highlight.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {highlight.likes_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {highlight.views_count || 0} views
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Posts Section */}
          {shouldShowPosts && posts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold">Community Posts</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {posts.map((post) => (
                  <Card
                    key={post.id}
                    className="p-6 cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5"
                    onClick={() => navigate('/community')}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="ring-2 ring-primary/20">
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
                          <Badge variant="secondary" className="capitalize">
                            {post.category}
                          </Badge>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-lg mb-2">{post.title}</h3>
                        <p className="text-muted-foreground line-clamp-3">{post.content}</p>
                      </div>

                      <div className="flex items-center gap-4 pt-2 border-t border-border">
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
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Lessons Section */}
          {shouldShowLessons && lessons.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-success" />
                <h3 className="text-xl font-bold">Featured Lessons</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lessons.map((lesson) => (
                  <Card
                    key={lesson.id}
                    className="p-6 cursor-pointer hover:border-success/50 transition-all hover:shadow-lg hover:shadow-success/5 group"
                    onClick={() => navigate(`/lessons/${lesson.id}`)}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-2 group-hover:text-success transition-colors">
                            {lesson.title}
                          </h3>
                          {lesson.difficulty_level && (
                            <Badge variant="outline" className="capitalize mb-2">
                              {lesson.difficulty_level}
                            </Badge>
                          )}
                        </div>
                        <BookOpen className="w-5 h-5 text-success" />
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {lesson.description || 'Master new chess strategies and techniques'}
                      </p>

                      {lesson.tags && lesson.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {lesson.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={lesson.profiles?.avatar_url || ''} />
                            <AvatarFallback>{lesson.profiles?.username?.[0] || 'C'}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {lesson.profiles?.display_name || lesson.profiles?.username}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {lesson.views_count || 0} views
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Coaches Section */}
          {shouldShowCoaches && coaches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-5 h-5 text-gold" />
                <h3 className="text-xl font-bold">Top Coaches</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {coaches.map((coach) => (
                  <Card
                    key={coach.id}
                    className="p-6 cursor-pointer hover:border-gold/50 transition-all hover:shadow-lg hover:shadow-gold/5 group"
                    onClick={() => navigate(`/coach/${coach.user_id}`)}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16 ring-2 ring-gold/30">
                          <AvatarImage src={coach.profiles?.avatar_url || ''} />
                          <AvatarFallback>{coach.profiles?.username?.[0] || 'C'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg truncate group-hover:text-gold transition-colors">
                            {coach.profiles?.display_name || coach.profiles?.username}
                          </h3>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-4 h-4 fill-gold text-gold" />
                            <span className="text-sm font-medium">{coach.rating?.toFixed(1) || '5.0'}</span>
                            <span className="text-xs text-muted-foreground">
                              ({coach.total_students || 0} students)
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {coach.bio || 'Expert chess coach ready to help you improve'}
                      </p>

                      {coach.specialties && coach.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {coach.specialties.slice(0, 3).map((specialty, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-sm font-semibold text-gold">
                          ${coach.hourly_rate || 25}/hr
                        </span>
                        <Button size="sm" variant="outline" className="text-xs">
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!shouldShowPosts && !shouldShowLessons && !shouldShowCoaches && !shouldShowReels && (
            <Card className="p-12 text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No content found for this filter</p>
              <Button onClick={() => setActiveTab('all')}>
                Show All Content
              </Button>
            </Card>
          )}
        </div>

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading more content...</span>
          </div>
        )}

        {/* Intersection Observer Target */}
        <div ref={loadMoreRef} className="h-4" />

        {/* View More */}
        <div className="mt-12 flex flex-wrap gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate('/community')}
            className="gap-2"
          >
            <Users className="w-4 h-4" />
            Explore Community
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/lessons')}
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Browse Lessons
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/coach-marketplace')}
            className="gap-2"
          >
            <GraduationCap className="w-4 h-4" />
            Find Coaches
          </Button>
        </div>
      </div>
    </section>
  );
};
