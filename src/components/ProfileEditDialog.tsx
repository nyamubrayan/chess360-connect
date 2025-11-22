import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

const profileSchema = z.object({
  display_name: z.string().max(100, "Display name must be less than 100 characters").optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileEditDialogProps {
  userId: string;
  currentProfile: {
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    username: string;
    show_training_stats: boolean | null;
  };
  onProfileUpdate: () => void;
}

export const ProfileEditDialog = ({ userId, currentProfile, onProfileUpdate }: ProfileEditDialogProps) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentProfile.avatar_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showTrainingStats, setShowTrainingStats] = useState(currentProfile.show_training_stats ?? false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: currentProfile.display_name || "",
      bio: currentProfile.bio || "",
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return currentProfile.avatar_url;

    setUploading(true);
    try {
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const avatarUrl = await uploadAvatar();

      const updates = {
        display_name: data.display_name || null,
        bio: data.bio || null,
        show_training_stats: showTrainingStats,
        ...(avatarUrl && { avatar_url: avatarUrl }),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;

      toast.success("Profile updated successfully");
      setOpen(false);
      onProfileUpdate();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit Profile</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarPreview || undefined} />
              <AvatarFallback>{currentProfile.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>Upload Avatar</span>
                </div>
              </Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={uploading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              {...register("display_name")}
              placeholder="Enter your display name"
            />
            {errors.display_name && (
              <p className="text-sm text-destructive">{errors.display_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              {...register("bio")}
              placeholder="Tell us about yourself..."
              rows={4}
            />
            {errors.bio && (
              <p className="text-sm text-destructive">{errors.bio.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="show-training-stats" className="text-base">
                Show Training Stats Publicly
              </Label>
              <p className="text-sm text-muted-foreground">
                Display your training statistics in the Networking Zone
              </p>
            </div>
            <Switch
              id="show-training-stats"
              checked={showTrainingStats}
              onCheckedChange={setShowTrainingStats}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {(isSubmitting || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
