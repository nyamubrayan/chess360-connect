import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { CommunityBar } from "@/components/CommunityBar";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Settings, HelpCircle } from "lucide-react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { HelpDialog } from "@/components/HelpDialog";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CommunityBar user={user} />
      
      <div className="flex-1">
        <div className="relative">
          <HeroSection />
        </div>

        <FeaturesSection />
      </div>

      <Footer />

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 left-6 flex flex-col gap-3 z-50">
        <Button
          size="icon"
          className="w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all"
          onClick={() => setHelpOpen(true)}
          title="Help"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
};

export default Index;
