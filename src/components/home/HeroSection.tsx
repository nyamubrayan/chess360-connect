import { Button } from "@/components/ui/button";
import { Play, Puzzle, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import heroImage from "@/assets/chess-hero.jpg";

export const HeroSection = () => {
  const navigate = useNavigate();
  const [currentWord, setCurrentWord] = useState(0);
  const words = ["Smart Training", "Play Online", "Detailed Analysis", "Chessmate Networking", "Smart Puzzles"];
  const [currentChessPiece, setCurrentChessPiece] = useState(0);
  
  const chessPieces = [
    { symbol: '♔', name: 'King' },
    { symbol: '♕', name: 'Queen' },
    { symbol: '♖', name: 'Rook' },
    { symbol: '♗', name: 'Bishop' },
    { symbol: '♘', name: 'Knight' },
    { symbol: '♙', name: 'Pawn' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentChessPiece((prev) => (prev + 1) % chessPieces.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [chessPieces.length]);

  return (
    <section className="relative overflow-hidden py-20 sm:py-32 px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>
      <img 
        src={heroImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-5"
        fetchPriority="high"
      />
      
      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          {/* Cycling Chess Piece Animation */}
          <div className="flex flex-col items-center justify-center mb-6">
            <motion.div
              key={currentChessPiece}
              className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl select-none"
              initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
              transition={{ 
                duration: 0.6,
                type: "spring",
                stiffness: 200,
                damping: 20
              }}
            >
              {chessPieces[currentChessPiece].symbol}
            </motion.div>
            <motion.p
              key={`name-${currentChessPiece}`}
              className="text-lg sm:text-xl md:text-2xl font-semibold text-primary mt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {chessPieces[currentChessPiece].name}
            </motion.p>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="block">
                Welcome to{" "}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
                    Chessafari
                  </span>
                  <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-50 blur-sm"></span>
                </span>
              </span>
              <span className="block mt-2 text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
                Explore{" "}
                <span className="relative inline-block min-w-[140px] xs:min-w-[170px] sm:min-w-[210px] md:min-w-[250px] lg:min-w-[300px] text-left align-baseline">
                  <span 
                    key={currentWord}
                    className="absolute left-0 bottom-0 text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent transition-opacity duration-700 ease-in-out animate-[fade-in_0.7s_ease-in-out]"
                  >
                    {words[currentWord]}
                  </span>
                  <span className="invisible text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl">{words[currentWord]}</span>
                </span>
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Experience the future of chess learning. Get real-time analysis, personalized training, 
              and join a global community of players advancing together.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button 
              size="lg" 
              className="text-lg px-8 h-14 shadow-lg hover:shadow-xl transition-all hover:scale-105"
              onClick={() => navigate("/lobby")}
            >
              <Play className="w-5 h-5 mr-2" />
              Start Playing Now
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 h-14 border-2 hover:scale-105 transition-all"
              onClick={() => navigate("/tournaments")}
            >
              <Trophy className="w-5 h-5 mr-2" />
              Tournaments
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 h-14 border-2 hover:scale-105 transition-all"
              onClick={() => navigate("/puzzles")}
            >
              <Puzzle className="w-5 h-5 mr-2" />
              Solve Puzzles
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
