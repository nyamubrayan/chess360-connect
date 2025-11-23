import { useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useChessSounds } from '@/hooks/useChessSounds';
import { Crown, Zap, Castle, Clock, Sparkles } from 'lucide-react';

interface SpinningWheelProps {
  onSelect: (option: string) => void;
  disabled?: boolean;
}

interface WheelOption {
  name: string;
  timeRange: string;
  icon: any;
  color: string;
}

const OPTIONS: WheelOption[] = [
  { name: 'BULLET', timeRange: '1-2 min', icon: Zap, color: '#8B6914' }, // brown/gold
  { name: 'BLITZ', timeRange: '3-5 min', icon: Zap, color: '#B8860B' }, // lighter brown
  { name: 'RAPID', timeRange: '10-15 min', icon: Castle, color: '#2F5D62' }, // teal
  { name: 'CLASSIC', timeRange: '30-60 min', icon: Crown, color: '#4169AB' }, // blue
  { name: 'CUSTOM MATCH', timeRange: 'Custom', icon: Sparkles, color: '#6B46C1' }, // purple
];

export function SpinningWheel({ onSelect, disabled }: SpinningWheelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const rotation = useMotionValue(0);
  const { playWheelSpin, playWheelLock } = useChessSounds();
  
  const segmentAngle = 360 / OPTIONS.length;
  
  const getSegmentPath = () => {
    const angleRad = (segmentAngle * Math.PI) / 180;
    const radius = 50; // percentage
    const x1 = 50 + radius * Math.sin(-angleRad / 2);
    const y1 = 50 - radius * Math.cos(-angleRad / 2);
    const x2 = 50 + radius * Math.sin(angleRad / 2);
    const y2 = 50 - radius * Math.cos(angleRad / 2);
    
    return `M 50 50 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };
  
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
        onSelect(OPTIONS[nextIndex].name);
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Wheel Container */}
      <div className="relative w-[320px] h-[320px] sm:w-[380px] sm:h-[380px]">
        {/* Pointer/Arrow at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-20">
          <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-primary drop-shadow-lg" />
        </div>
        
        {/* Wheel */}
        <motion.div
          className="relative w-full h-full rounded-full shadow-2xl"
          style={{ rotate: rotation, backgroundColor: '#0a0a0a' }}
        >
          {/* Golden outer ring */}
          <div className="absolute inset-0 rounded-full border-[3px] border-yellow-600/80 pointer-events-none" 
               style={{ boxShadow: '0 0 20px rgba(202, 138, 4, 0.3)' }} />
          
          {/* Wheel segments */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            {OPTIONS.map((option, index) => {
              const angle = index * segmentAngle - 90; // Start from top
              const isAtTop = index === selectedIndex;
              const Icon = option.icon;
              
              return (
                <g key={option.name} transform={`rotate(${angle} 50 50)`}>
                  <path
                    d={getSegmentPath()}
                    fill={option.color}
                    stroke="#000"
                    strokeWidth="0.5"
                    className="transition-all duration-300"
                    style={{
                      filter: isAtTop ? 'brightness(1.2)' : 'brightness(1)',
                    }}
                  />
                </g>
              );
            })}
          </svg>
          
          {/* Text and icons overlays */}
          {OPTIONS.map((option, index) => {
            const angle = index * segmentAngle;
            const isAtTop = index === selectedIndex;
            const Icon = option.icon;
            
            return (
              <div
                key={`text-${option.name}`}
                className="absolute inset-0 pointer-events-none"
                style={{
                  transform: `rotate(${angle}deg)`,
                }}
              >
                <div className="absolute left-1/2 top-[25%] -translate-x-1/2 flex flex-col items-center gap-1">
                  <Icon className={`w-6 h-6 sm:w-7 sm:h-7 text-yellow-500/90 transition-all duration-300 ${isAtTop ? 'scale-110' : ''}`} />
                  <div className="text-center">
                    <div className={`text-xs sm:text-sm font-bold text-yellow-500/90 tracking-wider transition-all duration-300 ${isAtTop ? 'scale-105' : ''}`}>
                      {option.name}
                    </div>
                    <div className="text-[10px] sm:text-xs text-yellow-500/60 font-medium mt-0.5">
                      {option.timeRange}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Center circle - clickable */}
          <button
            onClick={handleCenterClick}
            disabled={disabled || isSpinning}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 disabled:opacity-50"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-900 to-black border-3 border-yellow-600/60 shadow-lg flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                 style={{ boxShadow: '0 0 15px rgba(202, 138, 4, 0.4)' }}>
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-700 animate-pulse" />
            </div>
          </button>
          
          {/* Inner segment dividers */}
          {OPTIONS.map((_, index) => (
            <div
              key={`divider-${index}`}
              className="absolute top-1/2 left-1/2 w-full h-[1px] origin-left pointer-events-none"
              style={{
                transform: `rotate(${index * segmentAngle}deg)`,
                background: 'rgba(0, 0, 0, 0.6)',
              }}
            />
          ))}
        </motion.div>
        
        {/* Outer glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-600/10 via-transparent to-yellow-600/10 blur-2xl -z-10" />
      </div>
    </div>
  );
}
