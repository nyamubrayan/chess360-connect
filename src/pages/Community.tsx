import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Heart, MessageCircle, Send, BookOpen, Sword, GraduationCap } from "lucide-react";
import { User, Session } from "@supabase/supabase-js";
import { CommentsSection } from "@/components/CommentsSection";
import { CommunityBar } from "@/components/CommunityBar";
import StudyRooms from "./StudyRooms";
import Tournaments from "./Tournaments";
import CoachMarketplace from "./CoachMarketplace";

interface Post {
  id: string;
  title: string;
  content: string;
  category: string | null;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const Community = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  const activeTab = searchParams.get("tab") || "posts";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel("posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles (
          username,
          display_name,
          avatar_url
        )
      `)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load posts");
    } else {
      setPosts(data || []);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to create a post");
      navigate("/auth");
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      category: category.trim() || null,
    });

    if (error) {
      toast.error("Failed to create post");
    } else {
      toast.success("Post created successfully!");
      setTitle("");
      setContent("");
      setCategory("");
      fetchPosts();
    }

    setLoading(false);
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error("Please sign in to like posts");
      navigate("/auth");
      return;
    }

    const { error } = await supabase.from("post_likes").insert({
      post_id: postId,
      user_id: user.id,
    });

    if (error) {
      if (error.code === "23505") {
        // Already liked, unlike it
        await supabase.from("post_likes").delete().match({
          post_id: postId,
          user_id: user.id,
        });
      } else {
        toast.error("Failed to like post");
      }
    }

    fetchPosts();
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="min-h-screen bg-background">
      <CommunityBar user={user} />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Community Hub</h1>
          <p className="text-muted-foreground">Connect with players, learn together, and compete</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span>Posts</span>
            </TabsTrigger>
            <TabsTrigger value="study-rooms" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>Study Rooms</span>
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="flex items-center gap-2">
              <Sword className="w-4 h-4" />
              <span>Tournaments</span>
            </TabsTrigger>
            <TabsTrigger value="coaches" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span>Coaches</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-6">
            {/* Create Post Form */}
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle>Create a Post</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreatePost} className="space-y-4">
                    <div>
                      <Input
                        placeholder="Post title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <Textarea
                        placeholder="What's on your mind?"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={loading}
                        className="min-h-[100px]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Category (optional)"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        disabled={loading}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={loading}>
                        <Send className="w-4 h-4 mr-2" />
                        Post
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Posts List */}
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={post.profiles.avatar_url || undefined} />
                          <AvatarFallback>
                            {post.profiles.username?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">
                              {post.profiles.display_name || post.profiles.username}
                            </p>
                            {post.is_pinned && (
                              <Badge variant="secondary" className="text-xs">
                                Pinned
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {post.category && (
                        <Badge variant="outline">{post.category}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {post.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                        className="flex items-center gap-1"
                      >
                        <Heart className="w-4 h-4" />
                        <span>{post.likes_count}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedPostId(
                            expandedPostId === post.id ? null : post.id
                          )
                        }
                        className="flex items-center gap-1"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.comments_count}</span>
                      </Button>
                    </div>
                    {expandedPostId === post.id && (
                      <CommentsSection postId={post.id} user={user} />
                    )}
                  </CardContent>
                </Card>
              ))}

              {posts.length === 0 && (
                <Card>
                  <CardContent className="py-12">
                    <p className="text-center text-muted-foreground">
                      No posts yet. Be the first to share something!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="study-rooms">
            <StudyRooms />
          </TabsContent>

          <TabsContent value="tournaments">
            <Tournaments />
          </TabsContent>

          <TabsContent value="coaches">
            <CoachMarketplace />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Community;
