import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Video, Puzzle, Eye, ArrowLeft, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LessonUploadDialog } from "@/components/LessonUploadDialog";

interface Lesson {
  id: string;
  title: string;
  description: string;
  lesson_type: string;
  difficulty_level: string;
  tags: string[];
  views_count: number;
  video_url?: string;
  file_url?: string;
  coach_id: string;
  profiles: {
    username: string;
    display_name: string;
  };
}

const Lessons = () => {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isCoach, setIsCoach] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) checkCoachRole(user.id);
    });
    fetchLessons();
  }, []);

  const checkCoachRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "coach")
      .single();
    
    setIsCoach(!!data);
  };

  const fetchLessons = async () => {
    let query = supabase
      .from("lessons")
      .select(`
        *,
        profiles:coach_id (username, display_name)
      `)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (selectedType !== "all") {
      query = query.eq("lesson_type", selectedType);
    }

    const { data, error } = await query;
    
    if (error) {
      toast.error("Failed to load lessons");
      return;
    }

    setLessons(data || []);
  };

  useEffect(() => {
    fetchLessons();
  }, [selectedType]);

  const getLessonIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="w-5 h-5" />;
      case "guide": return <BookOpen className="w-5 h-5" />;
      case "puzzle_set": return <Puzzle className="w-5 h-5" />;
      default: return <BookOpen className="w-5 h-5" />;
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

  const viewLesson = (lessonId: string) => {
    navigate(`/lessons/${lessonId}`);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold">Chess Lessons</h1>
              <p className="text-muted-foreground mt-1">
                Learn from expert coaches
              </p>
            </div>
          </div>
          {isCoach && (
            <Button onClick={() => setIsUploadOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload Lesson
            </Button>
          )}
        </div>

        <Tabs value={selectedType} onValueChange={setSelectedType} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="video">Videos</TabsTrigger>
            <TabsTrigger value="guide">Guides</TabsTrigger>
            <TabsTrigger value="puzzle_set">Puzzles</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => (
            <Card key={lesson.id} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getLessonIcon(lesson.lesson_type)}
                    <Badge variant="secondary" className="capitalize">
                      {lesson.lesson_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <Badge className={getDifficultyColor(lesson.difficulty_level)}>
                    {lesson.difficulty_level}
                  </Badge>
                </div>
                <CardTitle className="line-clamp-2">{lesson.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {lesson.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>By {lesson.profiles.display_name || lesson.profiles.username}</span>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {lesson.views_count}
                  </div>
                </div>
                {lesson.tags && lesson.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {lesson.tags.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => viewLesson(lesson.id)}
                >
                  View Lesson
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {lessons.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No lessons available</h3>
            <p className="text-muted-foreground">
              {isCoach ? "Start by uploading your first lesson!" : "Check back soon for new content"}
            </p>
          </div>
        )}
      </div>

      {isCoach && (
        <LessonUploadDialog 
          open={isUploadOpen} 
          onOpenChange={setIsUploadOpen}
          onSuccess={fetchLessons}
        />
      )}
    </div>
  );
};

export default Lessons;
