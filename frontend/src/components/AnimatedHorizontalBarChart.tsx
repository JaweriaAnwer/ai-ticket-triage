import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface HorizontalBarItem {
  name: string;
  value: number;
  color?: string;
}

const COLORS = ['#79b7dc', '#d3ccca', '#fa8030', '#e6e725', '#cb8c4d'];

// Custom Hook for Counter Animation
function useCounter(end: number, delayMs: number, durationMs: number) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;

      if (elapsed > delayMs) {
        const progress = Math.min((elapsed - delayMs) / durationMs, 1);
        // smooth standard easing approximation
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(easeProgress * end));
      }

      if (elapsed < delayMs + durationMs) {
        requestAnimationFrame(animate);
      } else {
        setCount(end); // Ensure it ends exactly on the value
      }
    };

    requestAnimationFrame(animate);
  }, [end, delayMs, durationMs]);

  return count;
}

export function AnimatedHorizontalBarChart({ data, title }: { data: HorizontalBarItem[], title: string }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  const easeSmooth = [0.4, 0, 0.2, 1];

  return (
    <div className="w-full h-full flex flex-col justify-center py-4 relative">
      
      {/* Title Animation */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.0, delay: 0.2, ease: easeSmooth }}
        className="mb-8"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
          {title}
        </h2>
      </motion.div>

      {/* Bars Container */}
      <div className="flex flex-col gap-4 w-full h-full justify-center">
        {data.map((item, index) => {
          // Center-out staggering logic from the JSON (middle items first)
          const middleIndex = Math.floor(data.length / 2);
          const distFromCenter = Math.abs(index - middleIndex);
          
          // Using base 1.2s delay for middle, adding 0.1s per step outwards
          const startDelay = 1.23 + (distFromCenter * 0.1); 
          const duration = 1.5; // From JSON: 1430 -> 2930 is 1500ms

          // Width calculation
          const widthPercent = Math.max((item.value / maxValue) * 100, 20); // Min 20% width to fit text
          const color = item.color || COLORS[index % COLORS.length];

          return (
            <HorizontalBar 
              key={item.name}
              item={item}
              color={color}
              widthPercent={widthPercent}
              startDelay={startDelay}
              duration={duration}
              easeSmooth={easeSmooth}
            />
          );
        })}
      </div>
    </div>
  );
}

// Sub-component to isolate the counter hook per bar
function HorizontalBar({ 
  item, 
  color, 
  widthPercent, 
  startDelay, 
  duration, 
  easeSmooth 
}: { 
  item: HorizontalBarItem, 
  color: string, 
  widthPercent: number, 
  startDelay: number, 
  duration: number, 
  easeSmooth: number[] 
}) {
  // Pass delay and duration in milliseconds for the counter
  const displayValue = useCounter(item.value, startDelay * 1000, duration * 1000);

  return (
    <motion.div
      initial={{ clipPath: 'inset(0 50% 0 50%)' }}
      animate={{ clipPath: 'inset(0 0% 0 0%)' }}
      transition={{ duration, delay: startDelay, ease: easeSmooth }}
      className="relative flex items-center justify-between overflow-hidden shadow-md"
      style={{ 
        width: `${widthPercent}%`, 
        backgroundColor: color,
        // Responsive height clamping to avoid overlapping while maintaining chunky look
        minHeight: '80px',
        maxHeight: '140px',
        height: '25vh'
      }}
    >
      {/* Top highlight bar (Rectangle 1 from JSON) */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/40" />

      {/* The number */}
      <div className="pl-6 md:pl-10 h-full flex flex-col justify-center">
        <span 
          className="text-4xl md:text-6xl lg:text-7xl font-black text-[#1c1c1c] tracking-tighter"
          style={{ lineHeight: '1' }}
        >
          {displayValue.toLocaleString()}
        </span>
      </div>

      {/* The label */}
      <div className="pr-6 md:pr-10 h-full flex flex-col justify-center text-right">
        <span className="text-sm md:text-lg lg:text-xl font-medium text-[#1c1c1c] tracking-tight truncate ml-4 max-w-[150px] md:max-w-xs">
          {item.name}
        </span>
      </div>
    </motion.div>
  );
}
