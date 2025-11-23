import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { User as UserIcon, Target, Users, Brain, Puzzle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";

interface HeaderActionsProps {
  user: User | null;
}

export const HeaderActions = ({ user }: HeaderActionsProps) => {
  const navigate = useNavigate();

  return (
    <div className="absolute top-4 right-4 z-20">
      <div className="flex gap-2 items-center">
        {user ? (
          <>
            <NotificationBell userId={user.id} />
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden md:flex border border-border/50 hover:border-primary/50"
              onClick={() => navigate('/profile')}
            >
              <UserIcon className="mr-2 w-4 h-4" />
              Profile
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden lg:flex border border-border/50 hover:border-primary/50"
              onClick={() => navigate('/analytics')}
            >
              <Target className="mr-2 w-4 h-4" />
              Analytics
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden md:flex border border-border/50 hover:border-primary/50"
              onClick={() => navigate('/puzzles')}
            >
              <Puzzle className="mr-2 w-4 h-4" />
              Puzzles
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden lg:flex border border-border/50 hover:border-primary/50"
              onClick={() => navigate('/leaderboard')}
            >
              <Users className="mr-2 w-4 h-4" />
              Leaderboard
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        )}
      </div>
    </div>
  );
};
