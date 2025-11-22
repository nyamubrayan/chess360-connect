import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";

// Lazy load route components for better code splitting
const ChessGame = lazy(() => import("./pages/ChessGame"));
const GameLobby = lazy(() => import("./pages/GameLobby"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Puzzles = lazy(() => import("./pages/Puzzles"));
const Training = lazy(() => import("./pages/Training"));
const Openings = lazy(() => import("./pages/Openings"));
const Endgames = lazy(() => import("./pages/Endgames"));
const Lessons = lazy(() => import("./pages/Lessons"));
const Connect = lazy(() => import("./pages/Connect"));
const Chat = lazy(() => import("./pages/Chat"));
const Tournaments = lazy(() => import("./pages/Tournaments"));
const TournamentDetail = lazy(() => import("./pages/TournamentDetail"));
const Highlights = lazy(() => import("./pages/Highlights"));
const NewsAndEvents = lazy(() => import("./pages/NewsAndEvents"));
const SharedGameAnalysis = lazy(() => import("./pages/SharedGameAnalysis"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <main>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/lobby" element={<GameLobby />} />
                <Route path="/game/:gameId" element={<ChessGame />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/puzzles" element={<Puzzles />} />
                <Route path="/training" element={<Training />} />
                <Route path="/openings" element={<Openings />} />
                <Route path="/endgames" element={<Endgames />} />
                <Route path="/lessons" element={<Lessons />} />
                <Route path="/connect" element={<Connect />} />
                <Route path="/chat/:friendId" element={<Chat />} />
                <Route path="/tournaments" element={<Tournaments />} />
                <Route path="/tournaments/:id" element={<TournamentDetail />} />
                <Route path="/highlights" element={<Highlights />} />
                <Route path="/news" element={<NewsAndEvents />} />
                <Route path="/game-analysis/:gameId" element={<SharedGameAnalysis />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
