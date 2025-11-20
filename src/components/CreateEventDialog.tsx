import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "lucide-react";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated?: () => void;
}

export default function CreateEventDialog({
  open,
  onOpenChange,
  onEventCreated
}: CreateEventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<string>("casual_play");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");

  const handleCreateEvent = async () => {
    if (!title || !eventDate || !eventTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to create an event");
        return;
      }

      // Get user's location
      const { data: profile } = await supabase
        .from("profiles")
        .select("latitude, longitude, city, country")
        .eq("id", user.id)
        .single();

      if (!profile?.latitude || !profile?.longitude) {
        toast.error("Please enable location services first");
        return;
      }

      const eventDateTime = new Date(`${eventDate}T${eventTime}`);

      const { error } = await supabase
        .from("local_events")
        .insert({
          organizer_id: user.id,
          title,
          description,
          event_type: eventType,
          event_date: eventDateTime.toISOString(),
          latitude: profile.latitude,
          longitude: profile.longitude,
          location_name: locationName,
          city: profile.city,
          country: profile.country,
          max_participants: maxParticipants ? parseInt(maxParticipants) : null
        });

      if (error) throw error;

      toast.success("Event created successfully!");
      onEventCreated?.();
      onOpenChange(false);
      
      // Reset form
      setTitle("");
      setDescription("");
      setEventType("casual_play");
      setEventDate("");
      setEventTime("");
      setLocationName("");
      setMaxParticipants("");
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Create Local Event
          </DialogTitle>
          <DialogDescription>
            Organize a local chess meetup, tournament, or training session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              placeholder="Weekend Chess Meetup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell players what to expect..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-type">Event Type *</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger id="event-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meetup">Casual Meetup</SelectItem>
                <SelectItem value="tournament">Tournament</SelectItem>
                <SelectItem value="casual_play">Casual Play</SelectItem>
                <SelectItem value="training">Training Session</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-date">Date *</Label>
              <Input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-time">Time *</Label>
              <Input
                id="event-time"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location Name</Label>
            <Input
              id="location"
              placeholder="Central Park Chess Tables"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your city and country will be used automatically
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-participants">Max Participants (Optional)</Label>
            <Input
              id="max-participants"
              type="number"
              placeholder="Leave empty for unlimited"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              min="2"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateEvent}
              className="flex-1"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
