import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, User } from "lucide-react";
import { toast } from "sonner";

interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  lesson_type: string;
  difficulty_level: string;
  tags: string[];
  views_count: number;
  video_url?: string;
  file_url?: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

const LessonView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchLesson(id);
      incrementViewCount(id);
    }
  }, [id]);

  const fetchLesson = async (lessonId: string) => {
    try {
      const { data, error } = await supabase
        .from("lessons")
        .select(`
          *,
          profiles:coach_id (username, display_name, avatar_url)
        `)
        .eq("id", lessonId)
        .single();

      if (error) throw error;
      setLesson(data);
    } catch (error) {
      toast.error("Failed to load lesson");
      navigate("/lessons");
    } finally {
      setIsLoading(false);
    }
  };

  const incrementViewCount = async (lessonId: string) => {
    // Increment view count
    const { data: current } = await supabase
      .from("lessons")
      .select("views_count")
      .eq("id", lessonId)
      .single();

    if (current) {
      await supabase
        .from("lessons")
        .update({ views_count: current.views_count + 1 })
        .eq("id", lessonId);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "beginner": return "bg-green-500/10 text-green-500";
      case "intermediate": return "bg-blue-500/10 text-blue-500";
      case "advanced": return "bg-orange-500/10 text-orange-500";
      case "master": return "bg-purple-500/10 text-purple-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/lessons")} className="mb-4">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="capitalize">
                    {lesson.lesson_type.replace("_", " ")}
                  </Badge>
                  <Badge className={getDifficultyColor(lesson.difficulty_level)}>
                    {lesson.difficulty_level}
                  </Badge>
                </div>
                <h1 className="text-3xl font-bold">{lesson.title}</h1>
                <p className="text-muted-foreground">{lesson.description}</p>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Eye className="w-4 h-4" />
                <span className="text-sm">{lesson.views_count}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {lesson.profiles.display_name || lesson.profiles.username}
                </p>
                <p className="text-sm text-muted-foreground">Instructor</p>
              </div>
            </div>

            {lesson.tags && lesson.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {lesson.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {lesson.video_url && (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <video
                  src={lesson.video_url}
                  controls
                  className="w-full h-full rounded-lg"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {lesson.file_url && (
              <div className="p-4 bg-muted rounded-lg">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(lesson.file_url, "_blank")}
                >
                  Download Lesson Materials
                </Button>
              </div>
            )}

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap">{lesson.content}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LessonView;
