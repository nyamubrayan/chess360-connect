import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface CreateTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTournamentDialog({ open, onOpenChange, onSuccess }: CreateTournamentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    format: "single_elimination",
    maxParticipants: "8",
    timeControl: "600",
    timeIncrement: "0",
    startDate: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('tournaments').insert({
        name: formData.name,
        description: formData.description || null,
        max_participants: parseInt(formData.maxParticipants),
        time_control: parseInt(formData.timeControl),
        time_increment: parseInt(formData.timeIncrement),
        start_date: formData.startDate || null,
        creator_id: user.id,
        format: formData.format,
        status: 'upcoming'
      });

      if (error) throw error;

      toast.success("Tournament created successfully!");
      onOpenChange(false);
      onSuccess();
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        format: "single_elimination",
        maxParticipants: "8",
        timeControl: "600",
        timeIncrement: "0",
        startDate: ""
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to create tournament");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Tournament</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Tournament Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Summer Championship 2024"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tournament details and rules..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="format">Tournament Format *</Label>
            <Select
              value={formData.format}
              onValueChange={(value) => setFormData({ ...formData, format: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_elimination">Single Elimination</SelectItem>
                <SelectItem value="round_robin">Round Robin</SelectItem>
                <SelectItem value="swiss">Swiss System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {formData.format === 'single_elimination' && 'Players are eliminated after one loss'}
              {formData.format === 'round_robin' && 'Everyone plays everyone once'}
              {formData.format === 'swiss' && 'Players face opponents with similar scores'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxParticipants">Max Players *</Label>
              <Select
                value={formData.maxParticipants}
                onValueChange={(value) => setFormData({ ...formData, maxParticipants: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 players</SelectItem>
                  <SelectItem value="8">8 players</SelectItem>
                  <SelectItem value="16">16 players</SelectItem>
                  <SelectItem value="32">32 players</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="timeControl">Time Control *</Label>
              <Select
                value={formData.timeControl}
                onValueChange={(value) => setFormData({ ...formData, timeControl: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">1 min (Bullet)</SelectItem>
                  <SelectItem value="180">3 min (Blitz)</SelectItem>
                  <SelectItem value="300">5 min (Blitz)</SelectItem>
                  <SelectItem value="600">10 min (Rapid)</SelectItem>
                  <SelectItem value="900">15 min (Rapid)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timeIncrement">Increment (sec)</Label>
              <Select
                value={formData.timeIncrement}
                onValueChange={(value) => setFormData({ ...formData, timeIncrement: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No increment</SelectItem>
                  <SelectItem value="2">+2 seconds</SelectItem>
                  <SelectItem value="5">+5 seconds</SelectItem>
                  <SelectItem value="10">+10 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">Start Date (optional)</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Tournament"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}