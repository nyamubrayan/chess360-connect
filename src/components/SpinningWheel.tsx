import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const { playWheelSpin, playWheelLock } = useChessSounds();
  
  const segmentAngle = 360 / OPTIONS.length;
  
  const handleDragEnd = (_: any, info: any) => {
    if (disabled || isSpinning) return;
    
    const velocity = info.velocity.y;
    const currentRotation = rotation.get();
    
    // Calculate spin based on velocity
    const spinAmount = velocity * 0.5;
    const finalRotation = currentRotation + spinAmount;
    
    // Normalize to find final segment
    const normalizedRotation = ((finalRotation % 360) + 360) % 360;
    const targetSegment = Math.floor((360 - normalizedRotation + segmentAngle / 2) / segmentAngle) % OPTIONS.length;
    const snapRotation = finalRotation - (normalizedRotation - (360 - targetSegment * segmentAngle));
    
    setIsSpinning(true);
    playWheelSpin();
    
    // Animate to snap position
    animate(rotation, snapRotation, {
      type: "spring",
      damping: 30,
      stiffness: 100,
      mass: 1.5,
      onComplete: () => {
        setIsSpinning(false);
        setSelectedIndex(targetSegment);
        playWheelLock();
        onSelect(OPTIONS[targetSegment]);
      }
    });
  };
  
  const handleSegmentClick = (index: number) => {
    if (disabled || isSpinning) return;
    
    const currentRotation = rotation.get();
    const targetRotation = 360 - (index * segmentAngle);
    const normalizedCurrent = ((currentRotation % 360) + 360) % 360;
    
    // Find shortest path
    let diff = targetRotation - normalizedCurrent;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    const finalRotation = currentRotation + diff;
    
    setIsSpinning(true);
    playWheelSpin();
    
    animate(rotation, finalRotation, {
      type: "spring",
      damping: 25,
      stiffness: 120,
      onComplete: () => {
        setIsSpinning(false);
        setSelectedIndex(index);
        playWheelLock();
        onSelect(OPTIONS[index]);
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-8" ref={containerRef}>
      {/* Wheel Container */}
      <div className="relative w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] md:w-[400px] md:h-[400px]">
        {/* Pointer/Arrow at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20">
          <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-primary drop-shadow-lg" />
        </div>
        
        {/* Wheel */}
        <motion.div
          className="relative w-full h-full rounded-full shadow-2xl cursor-grab active:cursor-grabbing"
          style={{ rotate: rotation }}
          drag
          dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          whileTap={{ scale: 0.98 }}
        >
          {/* Center circle decoration */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-background border-4 border-primary shadow-lg z-10 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent animate-pulse" />
            </div>
          </div>
          
          {/* Wheel segments */}
          {OPTIONS.map((option, index) => {
            const angle = index * segmentAngle;
            const isSelected = selectedIndex === index;
            
            return (
              <div
                key={option}
                className="absolute inset-0"
                style={{
                  transform: `rotate(${angle}deg)`,
                }}
                onClick={() => handleSegmentClick(index)}
              >
                <div 
                  className="absolute w-full h-1/2 origin-bottom transition-all duration-300"
                  style={{
                    clipPath: `polygon(50% 100%, ${50 - 50 * Math.sin(Math.PI / OPTIONS.length)}% 0%, ${50 + 50 * Math.sin(Math.PI / OPTIONS.length)}% 0%)`,
                    background: isSelected 
                      ? `linear-gradient(to top, ${COLORS[index]}, ${COLORS[index]}dd)` 
                      : COLORS[index],
                    boxShadow: isSelected ? '0 0 20px rgba(0,0,0,0.3) inset' : 'none',
                  }}
                />
                
                {/* Text label */}
                <div
                  className="absolute left-1/2 top-[20%] -translate-x-1/2 pointer-events-none"
                  style={{
                    transform: `translateX(-50%) rotate(${90}deg)`,
                  }}
                >
                  <span className={`text-sm sm:text-base md:text-lg font-bold text-background drop-shadow-lg whitespace-nowrap transition-all duration-300 ${isSelected ? 'scale-110' : ''}`}>
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
