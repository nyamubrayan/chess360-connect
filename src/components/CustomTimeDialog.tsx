import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, Timer, Trophy, Sparkles } from 'lucide-react';

interface CustomTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (timeControl: number, timeIncrement: number) => void;
}

const PRESETS = [
  { time: 5, increment: 0, label: '5+0', category: 'Blitz' },
  { time: 10, increment: 0, label: '10+0', category: 'Rapid' },
  { time: 15, increment: 10, label: '15+10', category: 'Rapid' },
  { time: 30, increment: 0, label: '30+0', category: 'Classical' },
];

export const CustomTimeDialog = ({ open, onOpenChange, onConfirm }: CustomTimeDialogProps) => {
  const [timeControl, setTimeControl] = useState(10);
  const [timeIncrement, setTimeIncrement] = useState(0);

  const getCategory = (time: number) => {
    if (time < 3) return 'Bullet';
    if (time < 10) return 'Blitz';
    if (time < 30) return 'Rapid';
    return 'Classical';
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'Bullet': return <Zap className="w-4 h-4" />;
      case 'Blitz': return <Timer className="w-4 h-4" />;
      case 'Rapid': return <Clock className="w-4 h-4" />;
      default: return <Trophy className="w-4 h-4" />;
    }
  };

  const getCategoryGradient = (category: string) => {
    switch(category) {
      case 'Bullet': return 'from-orange-500 to-red-500';
      case 'Blitz': return 'from-yellow-500 to-orange-500';
      case 'Rapid': return 'from-emerald-500 to-teal-500';
      default: return 'from-blue-500 to-purple-500';
    }
  };

  const handleConfirm = () => {
    onConfirm(timeControl, timeIncrement);
    onOpenChange(false);
  };

  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    setTimeControl(preset.time);
    setTimeIncrement(preset.increment);
  };

  const category = getCategory(timeControl);
  const gradient = getCategoryGradient(category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl border-2 border-border/50 bg-gradient-to-br from-background via-background to-muted/30 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${gradient}`}>
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            Custom Time Control
          </DialogTitle>
          <DialogDescription className="text-base">
            Craft your perfect chess experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-6">
          {/* Live Preview Card */}
          <motion.div
            layout
            className="relative overflow-hidden rounded-2xl border-2 border-border/50"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
            
            <div className="relative p-8 text-center">
              <motion.div
                key={`${timeControl}-${timeIncrement}`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center gap-3">
                  {getCategoryIcon(category)}
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </span>
                </div>
                
                <div className="text-7xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {timeControl}+{timeIncrement}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {timeControl} {timeControl === 1 ? 'minute' : 'minutes'} + {timeIncrement} {timeIncrement === 1 ? 'second' : 'seconds'} per move
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Quick Presets */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Presets
            </label>
            <div className="grid grid-cols-4 gap-3">
              {PRESETS.map((preset) => (
                <motion.button
                  key={preset.label}
                  onClick={() => handlePresetSelect(preset)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    p-3 rounded-xl border-2 transition-all
                    ${timeControl === preset.time && timeIncrement === preset.increment
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                      : 'border-border/50 hover:border-primary/50 bg-card/50'
                    }
                  `}
                >
                  <div className="text-lg font-bold">{preset.label}</div>
                  <div className="text-xs text-muted-foreground">{preset.category}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Time Control Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Time Control
              </label>
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/50 border border-border/50">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-mono font-bold">{timeControl} min</span>
              </div>
            </div>
            
            <div className="relative px-2">
              <Slider
                value={[timeControl]}
                onValueChange={(value) => setTimeControl(value[0])}
                min={1}
                max={180}
                step={1}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>1 min</span>
                <span>180 min</span>
              </div>
            </div>
          </div>

          {/* Increment Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Increment
              </label>
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/50 border border-border/50">
                <Timer className="w-4 h-4 text-primary" />
                <span className="font-mono font-bold">{timeIncrement} sec</span>
              </div>
            </div>
            
            <div className="relative px-2">
              <Slider
                value={[timeIncrement]}
                onValueChange={(value) => setTimeIncrement(value[0])}
                min={0}
                max={60}
                step={1}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>0 sec</span>
                <span>60 sec</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/30"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start Match
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};