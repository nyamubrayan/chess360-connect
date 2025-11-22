import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User, Session } from "@supabase/supabase-js";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { GameHistory } from "@/components/GameHistory";
import { TrainingStats } from "@/components/training/TrainingStats";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  rating: number | null;
  created_at: string;
  show_training_stats: boolean | null;
}


interface PlayerStats {
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
}

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async () => {
    const profileId = userId || user?.id;
    if (!profileId) {
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (profileError) {
      toast.error("Failed to load profile");
      setLoading(false);
      return;
    }

    setProfile(profileData);

    const { data: playerStatsData } = await supabase
      .from("player_stats")
      .select("*")
      .eq("user_id", profileId)
      .single();

    setPlayerStats(playerStatsData);
    setLoading(false);
  };

  useEffect(() => {
    if (user || userId) {
      fetchProfile();
    }
  }, [user, userId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p>Profile not found</p>
        <Button onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/")}>← Back to Home</Button>
          {isOwnProfile && (
            <div className="flex gap-2">
              <ProfileEditDialog
                userId={profile.id}
                currentProfile={{
                  display_name: profile.display_name,
                  bio: profile.bio,
                  avatar_url: profile.avatar_url,
                  username: profile.username,
                  show_training_stats: profile.show_training_stats,
                }}
                onProfileUpdate={fetchProfile}
              />
              <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback>{profile.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl">{profile.display_name || profile.username}</CardTitle>
              <p className="text-muted-foreground">@{profile.username}</p>
              <div className="flex gap-2 mt-2">
                <Badge>Rating: {profile.rating || 1200}</Badge>
              </div>
            </div>
          </CardHeader>
          {profile.bio && (
            <CardContent>
              <p className="text-muted-foreground">{profile.bio}</p>
            </CardContent>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Game Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Games</span>
                <span className="font-semibold">{playerStats?.total_games || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wins</span>
                <span className="font-semibold text-green-500">{playerStats?.wins || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Losses</span>
                <span className="font-semibold text-red-500">{playerStats?.losses || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Draws</span>
                <span className="font-semibold">{playerStats?.draws || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Win Rate</span>
                <span className="font-semibold">{playerStats?.win_rate || 0}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member Since</span>
                <span className="font-semibold">
                  {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Training Stats */}
        {(isOwnProfile || profile.show_training_stats) && (
          <Card>
            <CardHeader>
              <CardTitle>Training Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <TrainingStats userId={profile.id} />
            </CardContent>
          </Card>
        )}

        {/* Game History */}
        <GameHistory userId={profile.id} limit={5} showAnalyzeButton={false} />
      </div>
    </div>
  );
};

export default Profile;
