import { useState } from "react";
import { Settings, HelpCircle, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpDialog } from "@/components/HelpDialog";
import { SettingsDialog } from "@/components/SettingsDialog";

export const QuickAccessFab = () => {
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="end" side="top">
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              className="justify-start gap-3"
              onClick={() => {
                setHelpOpen(true);
                setPopoverOpen(false);
              }}
            >
              <HelpCircle className="h-5 w-5" />
              Help
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-3"
              onClick={() => {
                setSettingsOpen(true);
                setPopoverOpen(false);
              }}
            >
              <Settings className="h-5 w-5" />
              Settings
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
};
