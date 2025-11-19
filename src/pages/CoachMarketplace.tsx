import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Users, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CoachProfile {
  id: string;
  bio: string | null;
  hourly_rate: number | null;
  rating: number | null;
  specialties: string[] | null;
  total_students: number | null;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    rating: number | null;
  };
  lessons: Array<{ id: string }>;
}

export default function CoachMarketplace() {
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchCoaches();
  }, []);

  const fetchCoaches = async () => {
    const { data: coachData, error } = await supabase
      .from('coach_profiles')
      .select(`
        *,
        profiles:user_id (username, display_name, avatar_url, rating)
      `)
      .order('rating', { ascending: false, nullsFirst: false });

    if (error) {
      toast({
        title: "Error loading coaches",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch lesson counts for each coach
    const coachesWithLessons = await Promise.all(
      (coachData || []).map(async (coach) => {
        const { count } = await supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .eq('coach_id', coach.user_id);
        
        return {
          ...coach,
          lessons: Array(count || 0).fill({ id: '' })
        };
      })
    );

    setCoaches(coachesWithLessons);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Coach Marketplace</h1>
        <p className="text-muted-foreground">Find expert coaches to improve your game</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {coaches.map((coach) => (
          <Card key={coach.id} className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/coach/${coach.profiles.username}`)}>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={coach.profiles.avatar_url || undefined} />
                  <AvatarFallback>
                    {(coach.profiles.display_name || coach.profiles.username).substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle>{coach.profiles.display_name || coach.profiles.username}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {coach.rating?.toFixed(1) || 'New'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {coach.bio && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{coach.bio}</p>
              )}
              
              {coach.specialties && coach.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {coach.specialties.slice(0, 3).map((specialty) => (
                    <Badge key={specialty} variant="secondary">{specialty}</Badge>
                  ))}
                </div>
              )}

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {coach.total_students || 0} students
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {coach.lessons.length} lessons
                  </span>
                </div>
                {coach.hourly_rate && (
                  <p className="font-medium text-primary text-base">
                    ${coach.hourly_rate}/hour
                  </p>
                )}
              </div>

              <Button className="w-full mt-4" onClick={(e) => {
                e.stopPropagation();
                navigate(`/coach/${coach.profiles.username}`);
              }}>
                View Profile
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {coaches.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No coaches available yet</p>
        </div>
      )}
    </div>
  );
}
