import { motion } from "framer-motion";

interface AnimatedMetricCardProps {
  title: string;
  value: string;
  trend: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

export function AnimatedMetricCard({ title, value, trend, icon, highlight = false }: AnimatedMetricCardProps) {
  const easeSmooth = [0.4, 0, 0.2, 1];

  return (
    <div className={`relative overflow-hidden p-4 rounded-xl border bg-[var(--color-surface)] ${highlight ? "border-red-500/30" : "border-[var(--color-border)]"}`}>
      
      {/* Spinning Geometric Pattern */}
      <div className="absolute -right-20 -top-20 w-64 h-64 opacity-20 pointer-events-none mix-blend-plus-lighter">
        <motion.div
          className="w-full h-full relative"
          animate={{ rotate: [0, 90, 90, 180, 180, 270, 270, 360] }}
          transition={{
            duration: 12, // 12 second full loop
            ease: "easeInOut",
            times: [0, 0.15, 0.35, 0.5, 0.7, 0.85, 1, 1], // Rhythmic stops
            repeat: Infinity,
          }}
        >
          {/* Creating the starburst/grid pattern using 4 intersecting thick bars */}
          <div className="absolute top-1/2 left-0 w-full h-4 bg-[var(--color-accent)] -translate-y-1/2 rounded-full" />
          <div className="absolute top-1/2 left-0 w-full h-4 bg-[var(--color-accent)] -translate-y-1/2 rounded-full rotate-45" />
          <div className="absolute top-1/2 left-0 w-full h-4 bg-[var(--color-accent)] -translate-y-1/2 rounded-full rotate-90" />
          <div className="absolute top-1/2 left-0 w-full h-4 bg-[var(--color-accent)] -translate-y-1/2 rounded-full rotate-[135deg]" />
        </motion.div>
      </div>

      {/* Content Layer */}
      <div className="relative z-10">
        
        {/* Title & Icon */}
        <div className="flex items-center justify-between mb-2 text-[var(--color-text-secondary)]">
          <div className="overflow-hidden">
            <motion.span 
              className="block text-sm font-medium uppercase tracking-wider"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1, ease: easeSmooth }}
            >
              {title}
            </motion.span>
          </div>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: easeSmooth }}
          >
            {icon}
          </motion.div>
        </div>

        {/* Value & Trend */}
        <div className="flex items-baseline gap-3">
          <div className="overflow-hidden">
            <motion.h3 
              className="block text-3xl font-bold text-white tracking-tight"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3, ease: easeSmooth }}
            >
              {value}
            </motion.h3>
          </div>
          
          <div className="overflow-hidden">
            <motion.span 
              className="block text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-background)] px-2 py-1 rounded-md border border-[var(--color-border)]"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4, ease: easeSmooth }}
            >
              {trend}
            </motion.span>
          </div>
        </div>

      </div>
    </div>
  );
}
