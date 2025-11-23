import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookmarkCheck, Trash2, BookOpen, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Bookmark {
  id: string;
  lesson_title: string;
  lesson_category: string;
  section_title: string;
  section_content: string;
  section_index: number;
  created_at: string;
}

export function MyNotes() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to view your notes');
        return;
      }

      const { data, error } = await supabase
        .from('lesson_bookmarks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBookmarks(data || []);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      toast.error('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lesson_bookmarks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBookmarks(prev => prev.filter(b => b.id !== id));
      toast.success('Note removed');
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      toast.error('Failed to delete note');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'opening': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'middlegame': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'endgame': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'tactics': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'strategy': return 'bg-pink-500/20 text-pink-500 border-pink-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card className="gradient-card">
        <CardContent className="p-12 text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">Loading your notes...</p>
        </CardContent>
      </Card>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <Card className="gradient-card">
        <CardContent className="p-12 text-center">
          <BookmarkCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No Notes Yet</h3>
          <p className="text-muted-foreground mb-6">
            Star lesson sections while studying to save them here for quick reference
          </p>
          <Button variant="outline">
            <BookOpen className="w-4 h-4 mr-2" />
            Browse Lessons
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Notes</h2>
          <p className="text-muted-foreground">
            {bookmarks.length} saved {bookmarks.length === 1 ? 'section' : 'sections'}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {bookmarks.map((bookmark) => (
          <Card 
            key={bookmark.id}
            className="gradient-card group hover:glow-primary transition-all"
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={getCategoryColor(bookmark.lesson_category)}>
                      {bookmark.lesson_category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">Section {bookmark.section_index + 1}</span>
                  </div>
                  <CardTitle className="text-lg">{bookmark.lesson_title}</CardTitle>
                  <CardDescription className="font-semibold text-foreground">
                    {bookmark.section_title}
                  </CardDescription>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Saved {format(new Date(bookmark.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(bookmark.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedId(expandedId === bookmark.id ? null : bookmark.id)}
                className="mb-2"
              >
                {expandedId === bookmark.id ? 'Hide' : 'Show'} Content
              </Button>

              {expandedId === bookmark.id && (
                <div className="mt-4 p-4 bg-muted/20 rounded-lg">
                  <div className="prose prose-sm prose-invert max-w-none">
                    <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {bookmark.section_content}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
