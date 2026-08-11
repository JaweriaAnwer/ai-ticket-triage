import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface DonutDataItem {
  name: string;
  value: number;
  color: string;
}

export function AnimatedDonutChart({ data, total }: { data: DonutDataItem[], total: number }) {
  const [displayCount, setDisplayCount] = useState(0);

  // Counter animation for the Total
  useEffect(() => {
    let startTime: number;
    const duration = 2600; // Matches the scale animation duration
    const delay = 600; // Delay before starting
    
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      
      if (elapsed > delay) {
        const progress = Math.min((elapsed - delay) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 4); // easeOutQuart
        setDisplayCount(Math.floor(easeProgress * total));
      }
      
      if (elapsed < delay + duration) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [total]);

  // SVG calculations
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  const easeSmooth = [0.4, 0, 0.2, 1]; 
  const easeNatural = [0.25, 0.1, 0.25, 1];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 1.5, ease: easeSmooth }}
      className="w-full h-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[32px] shadow-lg p-8 flex flex-col md:flex-row items-center justify-between gap-8"
    >
      {/* Chart Section */}
      <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center shrink-0">
        <motion.svg 
          initial={{ rotate: -180 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 4.0, ease: easeSmooth }}
          className="w-full h-full -rotate-90 drop-shadow-md" 
          viewBox="0 0 200 200"
        >
          <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--color-background)" strokeWidth="20" />
          
          {data.map((item, i) => {
            const dash = (item.value / total) * circumference;
            const offset = currentOffset;
            currentOffset -= dash; 
            
            const arcDelay = i * 0.33;

            return (
              <motion.circle
                key={item.name}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="20"
                strokeDasharray={`${dash} ${circumference}`}
                initial={{ strokeDashoffset: offset + dash }} // Start completely hidden
                animate={{ strokeDashoffset: offset }} // Sweep to its correct slice
                transition={{ duration: 3.3, delay: arcDelay, ease: easeNatural }}
                strokeLinecap="butt"
              />
            );
          })}
        </motion.svg>
        
        {/* Total Text in the center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span 
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2.6, delay: 0.6, ease: easeSmooth }}
            className="text-4xl font-bold text-white tracking-tight"
          >
            {displayCount.toLocaleString()}
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2.0, delay: 1.0 }}
            className="text-xs text-[var(--color-text-secondary)] font-medium uppercase tracking-widest mt-1"
          >
            Total
          </motion.span>
        </div>
      </div>

      {/* Datatable Section */}
      <div className="flex-1 w-full max-w-sm flex flex-col gap-4">
        {/* Table Header (Optional, but adds structure) */}
        <div className="flex justify-between items-end mb-2 border-b border-[var(--color-border)] pb-2">
          <h3 className="text-xl font-semibold text-white">Issue Breakdown</h3>
          <span className="text-sm text-[var(--color-text-secondary)]">By Category</span>
        </div>

        {/* Datatable Rows */}
        <div className="flex flex-col gap-3 w-full">
          {data.map((item, i) => {
            const rowDelay = 0.33 + (i * 0.33);
            const percent = ((item.value / total) * 100).toFixed(2);

            return (
              <motion.div
                key={item.name}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ 
                  duration: 2.6, 
                  delay: rowDelay, 
                  ease: easeSmooth,
                  opacity: { duration: 2.0, delay: rowDelay }
                }}
                className="flex items-center justify-between w-full p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium text-white truncate max-w-[120px]" title={item.name}>
                    {item.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-sm text-[var(--color-text-secondary)] w-16 text-right">
                    {percent}%
                  </span>
                  <span className="text-sm font-bold text-white w-12 text-right">
                    {item.value.toLocaleString()}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
