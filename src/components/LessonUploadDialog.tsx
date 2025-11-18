import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface LessonUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const LessonUploadDialog = ({ open, onOpenChange, onSuccess }: LessonUploadDialogProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    lesson_type: "guide",
    difficulty_level: "beginner",
    tags: "",
    is_published: false,
  });
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let fileUrl = null;
      
      // Upload file if provided
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('lessons')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('lessons')
          .getPublicUrl(fileName);
        
        fileUrl = publicUrl;
      }

      // Create lesson
      const { error: insertError } = await supabase
        .from('lessons')
        .insert({
          coach_id: user.id,
          title: formData.title,
          description: formData.description,
          content: formData.content,
          lesson_type: formData.lesson_type,
          difficulty_level: formData.difficulty_level,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          is_published: formData.is_published,
          video_url: formData.lesson_type === 'video' ? fileUrl : null,
          file_url: formData.lesson_type !== 'video' ? fileUrl : null,
        });

      if (insertError) throw insertError;

      toast.success("Lesson uploaded successfully!");
      onOpenChange(false);
      onSuccess();
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        content: "",
        lesson_type: "guide",
        difficulty_level: "beginner",
        tags: "",
        is_published: false,
      });
      setFile(null);
    } catch (error: any) {
      console.error('Error uploading lesson:', error);
      toast.error(error.message || "Failed to upload lesson");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload New Lesson</DialogTitle>
          <DialogDescription>
            Share your chess knowledge with the community
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Mastering the Sicilian Defense"
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              placeholder="Brief overview of what students will learn"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lesson_type">Lesson Type *</Label>
              <Select
                value={formData.lesson_type}
                onValueChange={(value) => setFormData({ ...formData, lesson_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                  <SelectItem value="puzzle_set">Puzzle Set</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="difficulty">Difficulty Level *</Label>
              <Select
                value={formData.difficulty_level}
                onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="content">Lesson Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              placeholder="Detailed lesson content, instructions, or puzzle descriptions"
              rows={6}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., openings, tactics, endgame"
            />
          </div>

          <div>
            <Label htmlFor="file">Upload File (optional)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="file"
                type="file"
                accept={formData.lesson_type === 'video' ? 'video/*' : '.pdf,.doc,.docx'}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && <Upload className="w-4 h-4 text-green-500" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formData.lesson_type === 'video' ? 'Video files only' : 'PDF or Word documents'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="publish"
              checked={formData.is_published}
              onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
            />
            <Label htmlFor="publish">Publish immediately</Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading} className="flex-1">
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Lesson"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
