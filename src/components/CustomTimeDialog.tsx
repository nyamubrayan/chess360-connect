import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Clock } from 'lucide-react';

interface CustomTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (timeControl: number, timeIncrement: number) => void;
}

export const CustomTimeDialog = ({ open, onOpenChange, onConfirm }: CustomTimeDialogProps) => {
  const [timeControl, setTimeControl] = useState('10');
  const [timeIncrement, setTimeIncrement] = useState('0');

  const handleConfirm = () => {
    const time = parseInt(timeControl);
    const increment = parseInt(timeIncrement);
    
    if (time < 1 || time > 180) {
      return;
    }
    
    if (increment < 0 || increment > 60) {
      return;
    }
    
    onConfirm(time, increment);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Custom Time Control
          </DialogTitle>
          <DialogDescription>
            Set your preferred time control and increment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="custom-time">Time Control (minutes)</Label>
            <Input
              id="custom-time"
              type="number"
              min="1"
              max="180"
              value={timeControl}
              onChange={(e) => setTimeControl(e.target.value)}
              placeholder="Enter minutes (1-180)"
            />
            <p className="text-xs text-muted-foreground">
              Total time per player in minutes
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-increment">Increment (seconds)</Label>
            <Input
              id="custom-increment"
              type="number"
              min="0"
              max="60"
              value={timeIncrement}
              onChange={(e) => setTimeIncrement(e.target.value)}
              placeholder="Enter seconds (0-60)"
            />
            <p className="text-xs text-muted-foreground">
              Time added after each move
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">Your selection:</span>
            <span className="text-lg font-bold text-primary">
              {timeControl}+{timeIncrement}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
              disabled={
                parseInt(timeControl) < 1 || 
                parseInt(timeControl) > 180 || 
                parseInt(timeIncrement) < 0 || 
                parseInt(timeIncrement) > 60
              }
            >
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
