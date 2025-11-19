import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Video, Puzzle, Eye, ArrowLeft, Plus, Sparkles, Target, Star, CheckCircle2 } from "lucide-react";
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
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        checkCoachRole(user.id);
        fetchRecommendations();
        fetchCompletedLessons(user.id);
      }
    });
    fetchLessons();
  }, []);

  const fetchCompletedLessons = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", userId)
        .eq("progress", 100);

      if (data) {
        setCompletedLessons(new Set(data.map(l => l.lesson_id).filter(Boolean)));
      }
    } catch (error) {
      console.error('Error fetching completed lessons:', error);
    }
  };

  const checkCoachRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "coach")
      .single();
    
    setIsCoach(!!data);
  };

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const { data, error } = await supabase.functions.invoke('recommend-lessons');
      
      if (error) {
        console.error('Error fetching recommendations:', error);
        return;
      }

      setRecommendations(data);
      
      // Refresh completed lessons list
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        fetchCompletedLessons(user.id);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingRecommendations(false);
    }
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

        <Tabs defaultValue="all" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="all">All Lessons</TabsTrigger>
              <TabsTrigger value="for-you" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                For You
              </TabsTrigger>
            </TabsList>

            <TabsList>
              <TabsTrigger 
                value="all"
                onClick={() => setSelectedType("all")}
              >
                All
              </TabsTrigger>
              <TabsTrigger 
                value="video"
                onClick={() => setSelectedType("video")}
              >
                Videos
              </TabsTrigger>
              <TabsTrigger 
                value="guide"
                onClick={() => setSelectedType("guide")}
              >
                Guides
              </TabsTrigger>
              <TabsTrigger 
                value="puzzle_set"
                onClick={() => setSelectedType("puzzle_set")}
              >
                Puzzles
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.map((lesson) => (
                <Card key={lesson.id} className="hover:border-primary transition-colors relative">
                  {completedLessons.has(lesson.id) && (
                    <div className="absolute top-2 right-2 z-10">
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    </div>
                  )}
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
                <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No lessons found</h3>
                <p className="text-muted-foreground">
                  {selectedType !== "all" 
                    ? "Try selecting a different category" 
                    : "Check back later for new content"}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="for-you">
            {loadingRecommendations ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading personalized recommendations...</p>
              </div>
            ) : !recommendations ? (
              <Card className="p-12 text-center">
                <Sparkles className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold mb-2">Get Personalized Recommendations</h3>
                <p className="text-muted-foreground mb-4">
                  Play some games to receive AI-powered lesson recommendations tailored to your skill level and playing style!
                </p>
                <Button onClick={() => navigate("/lobby")}>Start Playing</Button>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Learning Path Summary */}
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">Your Learning Path</h3>
                      <p className="text-muted-foreground mb-4">{recommendations.learning_path_summary}</p>
                      
                      {/* Progress Overview */}
                      <div className="mt-4 p-3 bg-accent/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Learning Progress</span>
                          <span className="text-sm text-primary font-bold">
                            {completedLessons.size} lessons completed
                          </span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={fetchRecommendations}
                          className="w-full mt-2"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Refresh Recommendations
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Recommended Lessons */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.recommendations
                    ?.sort((a: any, b: any) => a.priority - b.priority)
                    .map((rec: any, index: number) => (
                      <Card 
                        key={index}
                        className="hover:shadow-lg transition-shadow p-6 relative overflow-hidden"
                      >
                        {rec.priority === 1 && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-primary text-primary-foreground">
                              <Star className="h-3 w-3 mr-1" />
                              Priority
                            </Badge>
                          </div>
                        )}

                        <div className="space-y-4">
                          <div>
                            <h3 className="text-xl font-bold mb-2">{rec.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {rec.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {rec.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {rec.category}
                            </Badge>
                          </div>

                          <div className="p-3 bg-accent/20 rounded-lg">
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Why this? </span>
                              {rec.reasoning}
                            </p>
                          </div>

                          <Button 
                            className="w-full"
                            variant="outline"
                            onClick={() => {
                              const matchingLesson = lessons.find(
                                l => l.title.toLowerCase().includes(rec.title.toLowerCase().split(' ')[0])
                              );
                              if (matchingLesson) {
                                navigate(`/lessons/${matchingLesson.id}`);
                              } else {
                                toast.info("This lesson is coming soon! We're creating content based on your needs.");
                              }
                            }}
                          >
                            <BookOpen className="mr-2 h-4 w-4" />
                            Start Learning
                          </Button>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <LessonUploadDialog 
          open={isUploadOpen} 
          onOpenChange={setIsUploadOpen}
          onSuccess={() => {
            fetchLessons();
            setIsUploadOpen(false);
          }}
        />
      </div>
    </div>
  );
};

export default Lessons;
