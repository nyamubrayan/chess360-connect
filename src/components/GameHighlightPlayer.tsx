import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Play, Pause, Share2, Download } from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { toast } from 'sonner';

interface KeyMoment {
  type: 'opening' | 'check' | 'checkmate' | 'capture' | 'critical' | 'result' | 'best_move' | 'blunder' | 'turning_point';
  title: string;
  moveNumber: number;
  fen: string;
  move?: string;
  description: string;
}

interface GameHighlightPlayerProps {
  highlightId: string;
  title: string;
  description: string;
  keyMoments: KeyMoment[];
  duration: number;
  onShare?: () => void;
  autoPlay?: boolean;
}

export const GameHighlightPlayer = ({
  highlightId,
  title,
  description,
  keyMoments,
  duration,
  onShare,
  autoPlay = false,
}: GameHighlightPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const intervalRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  const currentMoment = keyMoments[currentMomentIndex];
  const timePerMoment = (duration * 1000) / keyMoments.length;

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + (100 / (duration * 10));
          if (newProgress >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return newProgress;
        });
      }, 100);

      // Switch moments
      const momentInterval = window.setInterval(() => {
        setCurrentMomentIndex((prev) => {
          if (prev >= keyMoments.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, timePerMoment);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        clearInterval(momentInterval);
      };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isPlaying, duration, keyMoments.length, timePerMoment]);

  const handlePlayPause = () => {
    if (progress >= 100) {
      setProgress(0);
      setCurrentMomentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = async () => {
    if (keyMoments.length === 0) {
      toast.error('No moments to record');
      return;
    }

    try {
      setIsDownloading(true);
      toast.info('Preparing download... This may take a moment.');

      // Create a canvas element
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Prepare to record
      const stream = canvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000 // 5 Mbps
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chess-highlight-${highlightId}-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Highlight downloaded! Convert to MP4 for wider compatibility.');
        setIsDownloading(false);
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);

      // Animate through moments
      const momentDuration = (duration * 1000) / keyMoments.length;
      
      for (let i = 0; i < keyMoments.length; i++) {
        const moment = keyMoments[i];
        
        // Draw background
        ctx.fillStyle = '#1a1f2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(moment.title, canvas.width / 2, 100);

        // Draw move if available
        if (moment.move) {
          ctx.font = 'bold 72px monospace';
          ctx.fillStyle = '#3b82f6';
          ctx.fillText(moment.move, canvas.width / 2, 540);
        }

        // Draw description
        ctx.font = '32px Inter';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(moment.description, canvas.width / 2, canvas.height - 80);

        // Wait for moment duration
        await new Promise(resolve => setTimeout(resolve, momentDuration));
      }

      // Stop recording
      mediaRecorder.stop();
      setIsRecording(false);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download highlight');
      setIsDownloading(false);
      setIsRecording(false);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/profile#highlight-${highlightId}`;
    const shareText = `Check out my chess highlight: ${title} - ${description}`;
    
    if (navigator.share) {
      // Use native share for mobile (works with TikTok, Instagram, etc.)
      navigator.share({
        title: title,
        text: shareText,
        url: shareUrl
      }).catch(() => {
        // Fallback to clipboard if user cancels
        navigator.clipboard.writeText(shareUrl);
        toast.success('Highlight link copied!');
      });
    } else {
      // Desktop: Copy to clipboard with shareable message
      const fullShare = `${shareText}\n${shareUrl}`;
      navigator.clipboard.writeText(fullShare);
      toast.success('Highlight link copied! Share on TikTok, Instagram, or YouTube Shorts!');
    }
  };

  const getMomentIcon = (type: string) => {
    switch (type) {
      case 'checkmate': return '🏆';
      case 'best_move': return '💎';
      case 'blunder': return '💥';
      case 'turning_point': return '⚡';
      case 'check': return '⚔️';
      case 'capture': return '🎯';
      case 'critical': return '⭐';
      case 'result': return '🎯';
      default: return '♟️';
    }
  };

  return (
    <Card className="gradient-card overflow-hidden">
      <div className="relative">
        {/* Chessboard Display */}
        <div ref={boardContainerRef} className="relative aspect-square bg-gradient-to-br from-primary/20 to-secondary/20">
          <Chessboard
            position={currentMoment?.fen}
            areArrowsAllowed={false}
            arePiecesDraggable={false}
            boardOrientation="white"
            customBoardStyle={{
              borderRadius: '0',
            }}
          />
          {isRecording && (
            <div className="absolute top-4 right-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-semibold animate-pulse flex items-center gap-2">
              <div className="h-2 w-2 bg-white rounded-full" />
              Recording
            </div>
          )}
          
          {/* Animated Overlay */}
          <div 
            className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
              isPlaying && (currentMoment?.type === 'checkmate' || currentMoment?.type === 'blunder') ? 'animate-pulse' : ''
            }`}
            style={{
              background: currentMoment?.type === 'checkmate' 
                ? 'radial-gradient(circle, rgba(234,179,8,0.4) 0%, transparent 70%)'
                : currentMoment?.type === 'best_move'
                ? 'radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)'
                : currentMoment?.type === 'blunder'
                ? 'radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 70%)'
                : currentMoment?.type === 'turning_point'
                ? 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)'
                : currentMoment?.type === 'check'
                ? 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 70%)'
                : 'transparent'
            }}
          />

          {/* Moment Title Overlay */}
          <div className="absolute top-4 left-0 right-0 flex justify-center">
            <div 
              className={`px-6 py-3 rounded-full backdrop-blur-md bg-background/80 border border-border shadow-lg transition-all duration-300 ${
                isPlaying ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getMomentIcon(currentMoment?.type)}</span>
                <span className="font-bold text-lg">{currentMoment?.title}</span>
              </div>
            </div>
          </div>

          {/* Move Display */}
          {currentMoment?.move && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <div 
                className={`px-6 py-3 rounded-full backdrop-blur-md border-2 shadow-lg transition-all duration-300 ${
                  currentMoment.type === 'checkmate' ? 'bg-gold/90 border-gold animate-bounce' :
                  currentMoment.type === 'best_move' ? 'bg-success/90 border-success' :
                  currentMoment.type === 'blunder' ? 'bg-destructive/90 border-destructive animate-bounce' :
                  'bg-background/90 border-primary'
                } ${isPlaying ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
              >
                <span className={`font-mono font-bold text-xl ${
                  currentMoment.type === 'checkmate' ? 'text-gold-foreground' :
                  currentMoment.type === 'best_move' ? 'text-success-foreground' :
                  currentMoment.type === 'blunder' ? 'text-destructive-foreground' :
                  'text-primary'
                }`}>
                  {currentMoment.move}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          {currentMoment && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              {currentMoment.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePlayPause}
            variant="default"
            size="sm"
            className="flex-1"
            disabled={isDownloading || isRecording}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : progress >= 100 ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                Replay
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Play
              </>
            )}
          </Button>
          
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            disabled={isDownloading || isRecording}
            title="Download as video"
          >
            {isDownloading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            onClick={handleShare}
            variant="outline"
            size="sm"
            disabled={isDownloading || isRecording}
            title="Share highlight"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Moment Indicators */}
        <div className="flex justify-center gap-1 pt-2">
          {keyMoments.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentMomentIndex
                  ? 'w-6 bg-primary'
                  : index < currentMomentIndex
                  ? 'w-1.5 bg-primary/50'
                  : 'w-1.5 bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
};
