import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Mail } from "lucide-react";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HelpDialog = ({ open, onOpenChange }: HelpDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <HelpCircle className="w-6 h-6" />
            Help & Support
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How do I start playing?</AccordionTrigger>
              <AccordionContent>
                Click "Start Playing Now" on the homepage or navigate to the Game Lobby. Select your preferred time control and the system will automatically match you with an opponent.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>How does the AI Mentor work?</AccordionTrigger>
              <AccordionContent>
                The AI Mentor provides real-time move analysis during games and training sessions. It evaluates each move, classifies it as good, questionable, mistake, or blunder, and explains the reasoning behind its assessment.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>How do I connect with other players?</AccordionTrigger>
              <AccordionContent>
                Visit the Networking Zone to browse player profiles. To send a connection request (ChessMate), you'll need to solve a chess puzzle as verification. Once connected, you can challenge friends, send messages, and track their online status.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>What are tournaments?</AccordionTrigger>
              <AccordionContent>
                Tournaments are organized competitive events with multiple formats: single-elimination, round-robin, and Swiss. Browse upcoming tournaments, register to participate, and track your progress through brackets or standings.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>How does Smart Training work?</AccordionTrigger>
              <AccordionContent>
                Smart Training includes multiple modules: Chess Basics (fundamentals), Puzzles (tactical training), Opening Theory (opening principles), Endgame Training (endgame techniques), and AI Coach (practice with analysis). Complete exercises to earn achievements, maintain streaks, and unlock new challenges.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger>How is my rating calculated?</AccordionTrigger>
              <AccordionContent>
                Your rating is based on game results: you gain points when you win, lose points when you lose, and your rating stays the same for draws. Rating changes are displayed immediately after each game.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
              <AccordionTrigger>Can I customize the app appearance?</AccordionTrigger>
              <AccordionContent>
                Yes! Click the Settings button (bottom left) to customize your theme (light/dark/system), font family, and font size to match your preferences.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8">
              <AccordionTrigger>How do game highlights work?</AccordionTrigger>
              <AccordionContent>
                After each game, you can generate shareable highlight reels featuring your best moves, critical moments, and game-ending sequences. Highlights can be viewed, saved to your profile, downloaded as MP4, or shared to social media.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Need More Help?
            </h3>
            <p className="text-sm text-muted-foreground">
              If you have questions not covered here, feel free to reach out to our support team or check our community forums for additional resources.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
