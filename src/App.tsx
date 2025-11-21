import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ChessGame from "./pages/ChessGame";
import GameLobby from "./pages/GameLobby";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Analytics from "./pages/Analytics";
import Puzzles from "./pages/Puzzles";
import Training from "./pages/Training";
import Openings from "./pages/Openings";
import Endgames from "./pages/Endgames";
import Lessons from "./pages/Lessons";
import Connect from "./pages/Connect";
import Chat from "./pages/Chat";
import Tournaments from "./pages/Tournaments";
import TournamentDetail from "./pages/TournamentDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
