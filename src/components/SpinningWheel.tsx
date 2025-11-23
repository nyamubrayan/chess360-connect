import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChessSounds } from '@/hooks/useChessSounds';
import { Crown, Zap, Castle, Clock, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface SpinningWheelProps {
  onSelect: (option: string) => void;
  disabled?: boolean;
}

interface WheelOption {
  name: string;
  displayName: string;
  timeRange: string;
  icon: any;
  gradient: string;
  description: string;
}

const OPTIONS: WheelOption[] = [
  { 
    name: 'BULLET', 
    displayName: 'Bullet',
    timeRange: '1-2 min', 
    icon: Zap, 
    gradient: 'from-orange-500 via-red-500 to-pink-500',
    description: 'Lightning fast games'
  },
  { 
    name: 'BLITZ', 
    displayName: 'Blitz',
    timeRange: '3-5 min', 
    icon: Zap, 
    gradient: 'from-yellow-500 via-orange-500 to-red-500',
    description: 'Quick tactical battles'
  },
  { 
    name: 'RAPID', 
    displayName: 'Rapid',
    timeRange: '10-15 min', 
    icon: Castle, 
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    description: 'Balanced gameplay'
  },
  { 
    name: 'CLASSIC', 
    displayName: 'Classic',
    timeRange: '30-60 min', 
    icon: Crown, 
    gradient: 'from-blue-500 via-indigo-500 to-purple-500',
    description: 'Deep strategic games'
  },
  { 
    name: 'CUSTOM MATCH', 
    displayName: 'Custom',
    timeRange: 'Your choice', 
    icon: Sparkles, 
    gradient: 'from-purple-500 via-pink-500 to-rose-500',
    description: 'Create your rules'
  },
];

export function SpinningWheel({ onSelect, disabled }: SpinningWheelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { playWheelSpin, playWheelLock } = useChessSounds();
  
  const handleNext = () => {
    if (disabled) return;
    const nextIndex = (selectedIndex + 1) % OPTIONS.length;
    playWheelSpin();
    setSelectedIndex(nextIndex);
    setTimeout(() => {
      playWheelLock();
      onSelect(OPTIONS[nextIndex].name);
    }, 300);
  };
  
  const handlePrev = () => {
    if (disabled) return;
    const prevIndex = (selectedIndex - 1 + OPTIONS.length) % OPTIONS.length;
    playWheelSpin();
    setSelectedIndex(prevIndex);
    setTimeout(() => {
      playWheelLock();
      onSelect(OPTIONS[prevIndex].name);
    }, 300);
  };
  
  const handleSelect = (index: number) => {
    if (disabled || index === selectedIndex) return;
    playWheelSpin();
    setSelectedIndex(index);
    setTimeout(() => {
      playWheelLock();
      onSelect(OPTIONS[index].name);
    }, 300);
  };

  const currentOption = OPTIONS[selectedIndex];
  const Icon = currentOption.icon;
  
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto px-4">
      {/* Main Display Card */}
      <div className="relative w-full">
        {/* Navigation Arrows */}
        <button
          onClick={handlePrev}
          disabled={disabled}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm border-2 border-primary/30 flex items-center justify-center hover:bg-primary/20 hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          <ChevronLeft className="w-6 h-6 text-primary" />
        </button>
        
        <button
          onClick={handleNext}
          disabled={disabled}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm border-2 border-primary/30 flex items-center justify-center hover:bg-primary/20 hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          <ChevronRight className="w-6 h-6 text-primary" />
        </button>

        {/* Center Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedIndex}
            initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative mx-auto w-full max-w-md"
          >
            {/* Glassmorphic Card */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20">
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${currentOption.gradient} opacity-90`} />
              
              {/* Glass Effect Overlay */}
              <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />
              
              {/* Animated Glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${currentOption.gradient} opacity-30 blur-2xl animate-pulse`} />
              
              {/* Content */}
              <div className="relative p-8 sm:p-12 text-center">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mb-6 flex justify-center"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-xl">
                    <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-lg" />
                  </div>
                </motion.div>
                
                {/* Title */}
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg tracking-tight"
                >
                  {currentOption.displayName}
                </motion.h2>
                
                {/* Time Range */}
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg sm:text-xl text-white/90 font-semibold mb-2"
                >
                  {currentOption.timeRange}
                </motion.p>
                
                {/* Description */}
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm sm:text-base text-white/70 font-medium"
                >
                  {currentOption.description}
                </motion.p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Option Pills */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 w-full">
        {OPTIONS.map((option, index) => {
          const OptionIcon = option.icon;
          const isSelected = index === selectedIndex;
          
          return (
            <motion.button
              key={option.name}
              onClick={() => handleSelect(index)}
              disabled={disabled}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                relative px-4 py-2 sm:px-6 sm:py-3 rounded-full transition-all duration-300
                ${isSelected 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/50 scale-105' 
                  : 'bg-muted/50 backdrop-blur-sm border border-border hover:bg-muted hover:border-primary/50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className="flex items-center gap-2">
                <OptionIcon className={`w-4 h-4 ${isSelected ? '' : 'opacity-70'}`} />
                <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
                  {option.displayName}
                </span>
              </div>
              
              {isSelected && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-0 rounded-full border-2 border-primary"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
