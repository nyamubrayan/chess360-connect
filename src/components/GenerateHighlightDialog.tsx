import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Download, Eye, Share2, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Game {
  id: string;
  white_player_username: string | null;
  black_player_username: string | null;
  white_player_rating: number | null;
  black_player_rating: number | null;
  result: string | null;
  completed_at: string | null;
  move_count: number | null;
  hasHighlight: boolean;
}

interface GenerateHighlightDialogProps {
  userId: string;
  onHighlightGenerated?: () => void;
  trigger?: React.ReactNode;
}

export const GenerateHighlightDialog = ({ userId, onHighlightGenerated, trigger }: GenerateHighlightDialogProps) => {
  const [open, setOpen] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [action, setAction] = useState<'view' | 'download' | 'share' | null>(null);

  useEffect(() => {
    if (open) {
      loadGames();
    }
  }, [open, userId]);

  const loadGames = async () => {
    try {
      setLoading(true);

      // Fetch completed games
      const { data: gamesData, error: gamesError } = await supabase
        .from('game_history')
        .select('*')
        .or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20);

      if (gamesError) throw gamesError;

      // Fetch existing highlights
      const { data: highlights, error: highlightsError } = await supabase
        .from('game_highlights')
        .select('game_id')
        .eq('user_id', userId);

      if (highlightsError) throw highlightsError;

      const highlightGameIds = new Set(highlights?.map(h => h.game_id) || []);

      const gamesWithHighlights = gamesData?.map(game => ({
        ...game,
        hasHighlight: highlightGameIds.has(game.id)
      })) || [];

      setGames(gamesWithHighlights);
    } catch (error) {
      console.error('Error loading games:', error);
      toast.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateHighlight = async (gameId: string, actionType: 'view' | 'download' | 'share') => {
    try {
      setGenerating(true);
      setSelectedGameId(gameId);
      setAction(actionType);

      const { data, error } = await supabase.functions.invoke('generate-game-highlight', {
        body: { gameId }
      });

      if (error) throw error;

      toast.success('Highlight generated successfully!');
      
      if (onHighlightGenerated) {
        onHighlightGenerated();
      }

      // Handle different actions
      if (actionType === 'view') {
        setOpen(false);
        window.location.href = `/profile#highlight-${data.highlight.id}`;
      } else if (actionType === 'share') {
        const shareUrl = `${window.location.origin}/profile#highlight-${data.highlight.id}`;
        if (navigator.share) {
          await navigator.share({
            title: data.highlight.title,
            text: data.highlight.description,
            url: shareUrl
          });
        } else {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Share link copied to clipboard!');
        }
      }
      // Download will be handled by the GameHighlightPlayer component

      await loadGames();
    } catch (error) {
      console.error('Error generating highlight:', error);
      toast.error('Failed to generate highlight');
    } finally {
      setGenerating(false);
      setSelectedGameId(null);
      setAction(null);
    }
  };

  const getResultBadge = (game: Game) => {
    const isWhite = game.white_player_username;
    const result = game.result;
    
    if (result === '1-0') return <Badge className="bg-gold text-gold-foreground">White Won</Badge>;
    if (result === '0-1') return <Badge className="bg-gold text-gold-foreground">Black Won</Badge>;
    if (result?.includes('1/2')) return <Badge variant="secondary">Draw</Badge>;
    return <Badge variant="outline">Unknown</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Highlight
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Game Highlights
          </DialogTitle>
          <DialogDescription>
            Select a game to create a shareable highlight reel featuring your best moves, blunders, and key moments.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No completed games found. Play a game to generate highlights!
            </div>
          ) : (
            games.map((game) => (
              <Card key={game.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">
                        {game.white_player_username} ({game.white_player_rating || '?'})
                      </span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="font-semibold">
                        {game.black_player_username} ({game.black_player_rating || '?'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {game.completed_at && formatDistanceToNow(new Date(game.completed_at), { addSuffix: true })}
                      <span>•</span>
                      <span>{game.move_count} moves</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getResultBadge(game)}
                      {game.hasHighlight && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Has Highlight
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerateHighlight(game.id, 'view')}
                    disabled={generating}
                    className="flex-1 min-w-[100px]"
                  >
                    {generating && selectedGameId === game.id && action === 'view' ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </>
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerateHighlight(game.id, 'download')}
                    disabled={generating}
                    className="flex-1 min-w-[100px]"
                  >
                    {generating && selectedGameId === game.id && action === 'download' ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </>
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerateHighlight(game.id, 'share')}
                    disabled={generating}
                    className="flex-1 min-w-[100px]"
                  >
                    {generating && selectedGameId === game.id && action === 'share' ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <Share2 className="h-3 w-3 mr-1" />
                        Share
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
