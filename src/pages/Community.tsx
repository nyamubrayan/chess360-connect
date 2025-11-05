import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Heart, MessageCircle, Send } from "lucide-react";
import { User, Session } from "@supabase/supabase-js";

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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Community Hub</h1>
          <Button variant="outline" onClick={() => navigate("/")}>← Home</Button>
        </div>

        {user && (
          <Card>
            <CardHeader>
              <CardTitle>Create a Post</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <Input
                  placeholder="Post title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <Input
                  placeholder="Category (optional)"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
                <Textarea
                  placeholder="What's on your mind?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  required
                />
                <Button type="submit" disabled={loading} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? "Posting..." : "Create Post"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={post.profiles.avatar_url || undefined} />
                      <AvatarFallback>
                        {post.profiles.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">
                        {post.profiles.display_name || post.profiles.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {post.category && <Badge variant="secondary">{post.category}</Badge>}
                </div>
                <CardTitle className="text-xl mt-4">{post.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                <div className="flex gap-4 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                    className="gap-2"
                  >
                    <Heart className="w-4 h-4" />
                    {post.likes_count}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <MessageCircle className="w-4 h-4" />
                    {post.comments_count}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {posts.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Be the first to create one!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Community;
