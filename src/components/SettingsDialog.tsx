import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, Monitor, Type, TextIcon } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { theme, setTheme, fontFamily, setFontFamily, fontSize, setFontSize } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Theme Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Sun className="w-4 h-4" />
              Theme
            </Label>
            <RadioGroup value={theme} onValueChange={(value) => setTheme(value as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light" className="cursor-pointer flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  Light
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark" className="cursor-pointer flex items-center gap-2">
                  <Moon className="w-4 h-4" />
                  Dark
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system" className="cursor-pointer flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  System
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Font Family Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Type className="w-4 h-4" />
              Font Family
            </Label>
            <RadioGroup value={fontFamily} onValueChange={(value) => setFontFamily(value as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inter" id="inter" />
                <Label htmlFor="inter" className="cursor-pointer" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Inter
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="roboto" id="roboto" />
                <Label htmlFor="roboto" className="cursor-pointer" style={{ fontFamily: "'Roboto', sans-serif" }}>
                  Roboto
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="open-sans" id="open-sans" />
                <Label htmlFor="open-sans" className="cursor-pointer" style={{ fontFamily: "'Open Sans', sans-serif" }}>
                  Open Sans
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lato" id="lato" />
                <Label htmlFor="lato" className="cursor-pointer" style={{ fontFamily: "'Lato', sans-serif" }}>
                  Lato
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="montserrat" id="montserrat" />
                <Label htmlFor="montserrat" className="cursor-pointer" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Montserrat
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Font Size Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <TextIcon className="w-4 h-4" />
              Font Size
            </Label>
            <RadioGroup value={fontSize} onValueChange={(value) => setFontSize(value as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="small" id="small" />
                <Label htmlFor="small" className="cursor-pointer text-sm">
                  Small
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="cursor-pointer text-base">
                  Medium
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="large" id="large" />
                <Label htmlFor="large" className="cursor-pointer text-lg">
                  Large
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="extra-large" id="extra-large" />
                <Label htmlFor="extra-large" className="cursor-pointer text-xl">
                  Extra Large
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
