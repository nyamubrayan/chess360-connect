import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LessonProgressTrackerProps {
  lessonId: string;
  lessonTitle: string;
  isCompleted: boolean;
  onProgressUpdate?: () => void;
}

export const LessonProgressTracker = ({ 
  lessonId, 
  lessonTitle, 
  isCompleted,
  onProgressUpdate 
}: LessonProgressTrackerProps) => {
  const [marking, setMarking] = useState(false);

  const handleMarkComplete = async () => {
    setMarking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to track progress");
        return;
      }

      if (isCompleted) {
        // Remove completion
        const { error } = await supabase
          .from("lesson_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId);

        if (error) throw error;
        toast.success("Lesson marked as incomplete");
      } else {
        // Mark as complete
        const { error } = await supabase
          .from("lesson_progress")
          .upsert({
            user_id: user.id,
            lesson_id: lessonId,
            lesson_title: lessonTitle,
            progress: 100,
            completed_at: new Date().toISOString()
          });

        if (error) throw error;
        toast.success("Great job! Lesson completed 🎉");
      }

      onProgressUpdate?.();
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Failed to update progress");
    } finally {
      setMarking(false);
    }
  };

  return (
    <Card className="p-4 bg-accent/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">
              {isCompleted ? "Completed" : "Mark as Complete"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isCompleted ? "You've finished this lesson" : "Track your learning progress"}
            </p>
          </div>
        </div>
        <Button
          onClick={handleMarkComplete}
          disabled={marking}
          variant={isCompleted ? "outline" : "default"}
          size="sm"
        >
          {marking ? "Updating..." : isCompleted ? "Undo" : "Complete"}
        </Button>
      </div>
    </Card>
  );
};
