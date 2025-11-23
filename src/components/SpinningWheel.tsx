import { useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useChessSounds } from '@/hooks/useChessSounds';

interface SpinningWheelProps {
  onSelect: (option: string) => void;
  disabled?: boolean;
}

const OPTIONS = ['Bullet', 'Blitz', 'Rapid', 'Classical', 'Custom'];
const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(var(--primary) / 0.7)', 'hsl(var(--accent) / 0.7)'];

export function SpinningWheel({ onSelect, disabled }: SpinningWheelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const rotation = useMotionValue(0);
  const { playWheelSpin, playWheelLock } = useChessSounds();
  
  const segmentAngle = 360 / OPTIONS.length;
  
  const handleCenterClick = () => {
    if (disabled || isSpinning) return;
    
    const nextIndex = (selectedIndex + 1) % OPTIONS.length;
    const currentRotation = rotation.get();
    
    // Calculate rotation to bring next segment to top
    const targetRotation = currentRotation + segmentAngle;
    
    setIsSpinning(true);
    playWheelSpin();
    
    animate(rotation, targetRotation, {
      type: "spring",
      damping: 20,
      stiffness: 100,
      onComplete: () => {
        setIsSpinning(false);
        setSelectedIndex(nextIndex);
        playWheelLock();
        onSelect(OPTIONS[nextIndex]);
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Wheel Container */}
      <div className="relative w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] md:w-[400px] md:h-[400px]">
        {/* Pointer/Arrow at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20">
          <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-primary drop-shadow-lg" />
        </div>
        
        {/* Wheel */}
        <motion.div
          className="relative w-full h-full rounded-full shadow-2xl"
          style={{ rotate: rotation }}
        >
          {/* Center circle - clickable */}
          <button
            onClick={handleCenterClick}
            disabled={disabled || isSpinning}
            className="absolute inset-0 flex items-center justify-center z-10 disabled:opacity-50"
            style={{ 
              width: '80px', 
              height: '80px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="w-20 h-20 rounded-full bg-background border-4 border-primary shadow-lg flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent animate-pulse" />
            </div>
          </button>
          
          {/* Wheel segments */}
          {OPTIONS.map((option, index) => {
            const angle = index * segmentAngle;
            const isAtTop = index === selectedIndex;
            
            return (
              <div
                key={option}
                className="absolute inset-0"
                style={{
                  transform: `rotate(${angle}deg)`,
                }}
              >
                <div 
                  className="absolute w-full h-1/2 origin-bottom transition-all duration-300"
                  style={{
                    clipPath: `polygon(50% 100%, ${50 - 50 * Math.sin(Math.PI / OPTIONS.length)}% 0%, ${50 + 50 * Math.sin(Math.PI / OPTIONS.length)}% 0%)`,
                    background: isAtTop 
                      ? `linear-gradient(to top, ${COLORS[index]}, ${COLORS[index]}dd)` 
                      : COLORS[index],
                    boxShadow: isAtTop ? '0 0 20px rgba(0,0,0,0.3) inset' : 'none',
                  }}
                />
                
                {/* Text label */}
                <div
                  className="absolute left-1/2 top-[20%] -translate-x-1/2 pointer-events-none"
                  style={{
                    transform: `translateX(-50%) rotate(${90}deg)`,
                  }}
                >
                  <span className={`text-sm sm:text-base md:text-lg font-bold text-background drop-shadow-lg whitespace-nowrap transition-all duration-300 ${isAtTop ? 'scale-110' : ''}`}>
                    {option}
                  </span>
                </div>
              </div>
            );
          })}
          
          {/* Outer ring border */}
          <div className="absolute inset-0 rounded-full border-8 border-primary/30 pointer-events-none" />
        </motion.div>
        
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-transparent to-accent/20 blur-xl -z-10 animate-pulse" />
      </div>
      
      {/* Selected display */}
      <div className="text-center animate-fade-in">
        <p className="text-sm text-muted-foreground mb-1">Selected</p>
        <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {OPTIONS[selectedIndex]}
        </p>
      </div>
    </div>
  );
}
