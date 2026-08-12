import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface BarDataItem {
  label: string;
  value: number;
}

function BarChartContent({ data }: { data: BarDataItem[] }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const midValue = Math.ceil(maxValue / 2);
  
  // Easing presets based on the JSON
  const easeSmooth = [0.4, 0, 0.2, 1] as const;
  const easeOvershoot = [0.175, 0.885, 0.32, 1.275] as const;
  
  return (
    <motion.div
      initial={{ opacity: 0, scaleY: 0.8, y: 150 }}
      animate={{ opacity: 1, scaleY: 1, y: 0 }}
      exit={{ opacity: 0, scaleY: 0.8, y: 150 }}
      transition={{
        duration: 0.8,
        ease: easeSmooth,
        opacity: { duration: 0.35, ease: "linear" },
        scaleY: { duration: 0.9, ease: easeSmooth },
        y: { duration: 1.15, ease: easeSmooth }
      }}
      className="w-full h-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[40px] shadow-lg relative p-12 flex flex-col justify-between overflow-hidden origin-bottom"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <motion.h2 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: easeSmooth, opacity: { duration: 0.4 } }}
          className="text-2xl font-medium text-white"
        >
          Submission Volume
        </motion.h2>
        <motion.span
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: easeSmooth, opacity: { duration: 0.4 } }}
          className="text-2xl font-medium text-[var(--color-text-secondary)]"
        >
          Last 7 days
        </motion.span>
      </div>

      {/* Chart Area */}
      <div className="relative flex-1 flex mt-8">
        
        {/* Y Axis Labels & Grid */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[maxValue, midValue, 0].map((val, i) => (
            <div key={i} className="flex items-center w-full relative">
              <span className="text-xs text-[var(--color-text-secondary)] w-8 flex-shrink-0 absolute -top-2">
                {val}
              </span>
              <div className="w-full h-[1px] border-b border-dashed border-[var(--color-border)] ml-10 opacity-50" />
            </div>
          ))}
        </div>

        {/* Bars Container */}
        <div className="flex-1 ml-10 flex items-end justify-between px-4 pb-0 z-10 relative h-[calc(100%-24px)] mt-2">
          {data.map((item, i) => {
            const heightPercent = (item.value / maxValue) * 100;
            // Stretch the staggering so it takes at least 3 seconds total
            // 7 items * 0.4s stagger = 2.8s + initial 0.5s = 3.3s total
            const barDelay = 0.5 + (i * 0.4); 
            const valueDelay = 0.65 + (i * 0.4); 

            return (
              <div key={i} className="flex flex-col items-center gap-2 h-full justify-end w-full max-w-[60px]">
                
                {/* Floating Value */}
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ 
                    duration: 0.5, 
                    delay: valueDelay, 
                    ease: easeOvershoot,
                    opacity: { duration: 0.3 }
                  }}
                  className="text-sm font-semibold text-white mb-1"
                >
                  {item.value}
                </motion.div>

                {/* The Bar */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  exit={{ height: 0 }}
                  transition={{
                    duration: 0.7,
                    delay: barDelay,
                    ease: easeOvershoot
                  }}
                  className="w-full bg-[var(--color-accent)] rounded-t-lg origin-bottom"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* X Axis Labels */}
      <div className="flex justify-between ml-10 px-4 mt-4">
        {data.map((item, i) => (
          <div key={i} className="w-full max-w-[60px] text-center">
            <span className="text-sm text-[var(--color-text-secondary)] tracking-wide">
              {item.label.substring(0, 3)}
            </span>
          </div>
        ))}
      </div>
      
    </motion.div>
  );
}

export function AnimatedBarChart({ data }: { data: BarDataItem[] }) {
  const [isVisible, setIsVisible] = useState(true);

  // 5 second loop timer
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  return (
    <div className="w-full h-full relative" style={{ perspective: "1000px" }}>
      <AnimatePresence 
        onExitComplete={() => {
          // Wait 500ms before re-triggering the animate in
          setTimeout(() => setIsVisible(true), 500);
        }}
      >
        {isVisible && <BarChartContent key="json-bar-chart" data={data} />}
      </AnimatePresence>
    </div>
  );
}
