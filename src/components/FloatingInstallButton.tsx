import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const FloatingInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem("install-dismissed");
    if (dismissed) {
      setIsDismissed(true);
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Immediately trigger the native install prompt
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Redirect to install page with detailed instructions
      navigate("/install");
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("install-dismissed", "true");
  };

  // Don't show if already installed or dismissed
  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-40"
    >
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-full shadow-2xl p-1.5 flex items-center gap-2">
        <Button
          onClick={handleInstall}
          size="sm"
          className="rounded-full px-4 gap-2"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Get App</span>
        </Button>
        <button
          onClick={handleDismiss}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
};
