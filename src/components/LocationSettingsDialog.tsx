import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Navigation } from "lucide-react";

interface LocationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationEnabled?: () => void;
}

export default function LocationSettingsDialog({
  open,
  onOpenChange,
  onLocationEnabled
}: LocationSettingsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  const handleEnableLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Get city and country from reverse geocoding (simplified version)
        // In production, you'd use a proper geocoding API
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          const cityName = data.address?.city || data.address?.town || data.address?.village || "";
          const countryName = data.address?.country || "";
          
          setCity(cityName);
          setCountry(countryName);

          // Update user profile with location
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase
              .from("profiles")
              .update({
                latitude,
                longitude,
                location_enabled: true,
                city: cityName,
                country: countryName
              })
              .eq("id", user.id);

            if (error) {
              toast.error("Failed to save location");
              setLoading(false);
              return;
            }

            setLocationEnabled(true);
            toast.success("Location enabled successfully!");
            onLocationEnabled?.();
            onOpenChange(false);
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          toast.error("Failed to get location details");
        }

        setLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Failed to get your location. Please enable location services.");
        setLoading(false);
      }
    );
  };

  const handleDisableLocation = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({
          latitude: null,
          longitude: null,
          location_enabled: false,
          city: null,
          country: null
        })
        .eq("id", user.id);

      if (error) {
        toast.error("Failed to disable location");
        setLoading(false);
        return;
      }

      setLocationEnabled(false);
      toast.success("Location disabled");
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location Settings
          </DialogTitle>
          <DialogDescription>
            Manage your location sharing preferences for finding nearby players and events.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Location Sharing</Label>
              <p className="text-sm text-muted-foreground">
                Share your location to find nearby players
              </p>
            </div>
            <Switch
              checked={locationEnabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleEnableLocation();
                } else {
                  handleDisableLocation();
                }
              }}
              disabled={loading}
            />
          </div>

          {locationEnabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  readOnly
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={country}
                  readOnly
                  disabled
                />
              </div>
            </div>
          )}

          {!locationEnabled && (
            <Button
              className="w-full"
              onClick={handleEnableLocation}
              disabled={loading}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Enable Location Access
            </Button>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Your exact location is never shared publicly</p>
            <p>• Only distance to other players/events is shown</p>
            <p>• You can disable location sharing anytime</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
