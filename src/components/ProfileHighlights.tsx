import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameHighlightPlayer } from './GameHighlightPlayer';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Share2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Highlight {
  id: string;
  game_id: string;
  title: string;
  description: string;
  key_moments: any;
  duration: number;
  views_count: number;
  likes_count: number;
  created_at: string;
}

interface ProfileHighlightsProps {
  userId: string;
  limit?: number;
}

export const ProfileHighlights = ({ userId, limit = 6 }: ProfileHighlightsProps) => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHighlights();
  }, [userId, limit]);

  const fetchHighlights = async () => {
    try {
      const query = supabase
        .from('game_highlights')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (limit) {
        query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setHighlights(data || []);
    } catch (error) {
      console.error('Error fetching highlights:', error);
      toast.error('Failed to load highlights');
    } finally {
      setLoading(false);
    }
  };

  const handleShareToCommunity = async (highlight: Highlight) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to share');
        return;
      }

      // Create a post with the highlight
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        title: `${highlight.title} 🎬`,
        content: `${highlight.description}\n\nCheck out this epic game highlight! 🔥\n\n#ChessHighlight #GameReplay`,
        category: 'highlights',
      });

      if (error) throw error;

      toast.success('Shared to community!', {
        action: {
          label: 'View',
          onClick: () => navigate('/community'),
        },
      });
    } catch (error) {
      console.error('Error sharing to community:', error);
      toast.error('Failed to share highlight');
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (highlights.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 space-y-3">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="font-semibold text-lg">No Highlights Yet</h3>
          <p className="text-sm text-muted-foreground">
            Highlights are automatically generated after each game!<br />
            Play a game to create your first highlight reel.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Game Highlights
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {highlights.map((highlight) => (
          <div key={highlight.id} className="relative">
            <GameHighlightPlayer
              highlightId={highlight.id}
              title={highlight.title}
              description={highlight.description}
              keyMoments={Array.isArray(highlight.key_moments) ? highlight.key_moments : []}
              duration={highlight.duration}
              onShare={() => handleShareToCommunity(highlight)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
