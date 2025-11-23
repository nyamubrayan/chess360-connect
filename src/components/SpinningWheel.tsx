import { useState } from 'react';
import { motion } from 'framer-motion';
import { useChessSounds } from '@/hooks/useChessSounds';
import { Crown, Zap, Castle, Sparkles } from 'lucide-react';

interface SpinningWheelProps {
  onSelect: (option: string, timeControl?: { time: number; increment: number; label: string }) => void;
  disabled?: boolean;
}

interface CategoryOption {
  name: string;
  displayName: string;
  icon: any;
  gradient: string;
  description: string;
}

interface TimeVariation {
  time: number;
  increment: number;
  label: string;
}

const CATEGORIES: CategoryOption[] = [
  { 
    name: 'BULLET', 
    displayName: 'Bullet',
    icon: Zap, 
    gradient: 'from-orange-500 via-red-500 to-pink-500',
    description: 'Lightning fast'
  },
  { 
    name: 'BLITZ', 
    displayName: 'Blitz',
    icon: Zap, 
    gradient: 'from-yellow-500 via-orange-500 to-red-500',
    description: 'Quick tactical'
  },
  { 
    name: 'RAPID', 
    displayName: 'Rapid',
    icon: Castle, 
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    description: 'Balanced play'
  },
  { 
    name: 'CLASSIC', 
    displayName: 'Classic',
    icon: Crown, 
    gradient: 'from-blue-500 via-indigo-500 to-purple-500',
    description: 'Deep strategy'
  },
  { 
    name: 'CUSTOM MATCH', 
    displayName: 'Custom',
    icon: Sparkles, 
    gradient: 'from-purple-500 via-pink-500 to-rose-500',
    description: 'Your rules'
  },
];

const TIME_VARIATIONS: Record<string, TimeVariation[]> = {
  'BULLET': [
    { time: 1, increment: 0, label: '1+0' },
    { time: 2, increment: 1, label: '2+1' },
  ],
  'BLITZ': [
    { time: 3, increment: 0, label: '3+0' },
    { time: 3, increment: 2, label: '3+2' },
    { time: 5, increment: 0, label: '5+0' },
    { time: 5, increment: 3, label: '5+3' },
  ],
  'RAPID': [
    { time: 10, increment: 0, label: '10+0' },
    { time: 10, increment: 5, label: '10+5' },
    { time: 15, increment: 10, label: '15+10' },
  ],
  'CLASSIC': [
    { time: 30, increment: 0, label: '30+0' },
    { time: 30, increment: 20, label: '30+20' },
  ],
};

export function SpinningWheel({ onSelect, disabled }: SpinningWheelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('BULLET');
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeVariation | null>(null);
  const { playWheelSpin, playWheelLock } = useChessSounds();
  
  const handleCategorySelect = (categoryName: string) => {
    if (disabled) return;
    playWheelSpin();
    setSelectedCategory(categoryName);
    setSelectedTimeControl(null);
    setTimeout(() => {
      playWheelLock();
      if (categoryName === 'CUSTOM MATCH') {
        onSelect(categoryName);
      }
    }, 200);
  };

  const handleTimeSelect = (timeControl: TimeVariation) => {
    if (disabled) return;
    playWheelLock();
    setSelectedTimeControl(timeControl);
    onSelect(selectedCategory, timeControl);
  };

  const currentCategory = CATEGORIES.find(c => c.name === selectedCategory) || CATEGORIES[0];
  const Icon = currentCategory.icon;
  const timeVariations = TIME_VARIATIONS[selectedCategory] || [];
  
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-5xl mx-auto px-4">
      {/* Large Category Display */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-2xl"
      >
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20">
          {/* Gradient Background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${currentCategory.gradient} opacity-90`} />
          
          {/* Glass Effect */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />
          
          {/* Animated Glow */}
          <div className={`absolute inset-0 bg-gradient-to-br ${currentCategory.gradient} opacity-30 blur-3xl animate-pulse`} />
          
          {/* Content */}
          <div className="relative p-12 sm:p-16 text-center">
            <motion.div
              key={selectedCategory}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center shadow-2xl">
                <Icon className="w-12 h-12 sm:w-16 sm:h-16 text-white drop-shadow-lg" />
              </div>
              
              <h2 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white drop-shadow-lg tracking-tight">
                {currentCategory.displayName}
              </h2>
              
              <p className="text-xl sm:text-2xl text-white/80 font-medium">
                {currentCategory.description}
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Category Selection Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 w-full max-w-4xl">
        {CATEGORIES.map((category) => {
          const CategoryIcon = category.icon;
          const isSelected = category.name === selectedCategory;
          
          return (
            <motion.button
              key={category.name}
              onClick={() => handleCategorySelect(category.name)}
              disabled={disabled}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                relative p-4 sm:p-6 rounded-2xl transition-all duration-300
                ${isSelected 
                  ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/50 ring-2 ring-primary' 
                  : 'bg-card border-2 border-border hover:border-primary/50 hover:shadow-lg'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className="flex flex-col items-center gap-2">
                <CategoryIcon className={`w-6 h-6 sm:w-8 sm:h-8 ${isSelected ? '' : 'opacity-70'}`} />
                <span className="text-xs sm:text-sm font-bold">
                  {category.displayName}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Time Variation Buttons */}
      {selectedCategory !== 'CUSTOM MATCH' && timeVariations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-3xl"
        >
          <h3 className="text-lg sm:text-xl font-semibold text-center mb-4 text-foreground">
            Select Time Control
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {timeVariations.map((variation) => {
              const isSelected = selectedTimeControl?.label === variation.label;
              
              return (
                <motion.button
                  key={variation.label}
                  onClick={() => handleTimeSelect(variation)}
                  disabled={disabled}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    p-4 sm:p-6 rounded-xl transition-all duration-300 font-bold text-lg sm:text-xl
                    ${isSelected 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/50 ring-2 ring-primary' 
                      : 'bg-muted border-2 border-border hover:border-primary/50 hover:bg-muted/80'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {variation.label}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
