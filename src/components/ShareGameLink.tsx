import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";

interface ShareGameLinkProps {
  roomId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareGameLink = ({ roomId, open, onOpenChange }: ShareGameLinkProps) => {
  const [copied, setCopied] = useState(false);
  const gameLink = `${window.location.origin}/play/${roomId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(gameLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const shareViaWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my chess game!",
          text: "Let's play chess together",
          url: gameLink,
        });
      } catch (err) {
        // User cancelled or error occurred
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Game Link</DialogTitle>
          <DialogDescription>
            Send this link to your friend to play together
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={gameLink} readOnly className="font-mono text-sm" />
            <Button size="icon" onClick={copyToClipboard} variant="outline">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          {navigator.share && (
            <Button onClick={shareViaWebShare} className="w-full" variant="secondary">
              <Share2 className="w-4 h-4 mr-2" />
              Share via...
            </Button>
          )}

          <div className="text-sm text-muted-foreground">
            Your friend will join as the black player when they click this link.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
