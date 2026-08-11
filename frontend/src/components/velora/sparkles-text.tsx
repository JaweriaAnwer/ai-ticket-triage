import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

interface SparklesTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  /** Number of sparkles */
  count?: number;
}

const colors = ["var(--color-accent)", "#C7B5F1", "#9d8df1"];

/**
 * Text with twinkling stars around it.
 */
export function SparklesText({
  children,
  className,
  count = 9,
  ...props
}: SparklesTextProps) {
  const reducedMotion = useReducedMotion();

  const sparkles = Array.from({ length: count }, (_, i) => ({
    top: `${(i * 41 + 7) % 100}%`,
    left: `${(i * 67 + 13) % 100}%`,
    size: 8 + ((i * 29) % 8),
    delay: ((i * 53) % 30) / 10,
    color: colors[i % colors.length],
  }));

  return (
    <span
      className={cn("relative inline-block", className)}
      {...props}
    >
      {!reducedMotion &&
        sparkles.map((s, i) => (
          <motion.svg
            key={i}
            aria-hidden
            viewBox="0 0 24 24"
            className="pointer-events-none absolute z-10"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              fill: s.color,
            }}
            initial={{ scale: 0, rotate: 0, opacity: 0 }}
            animate={{ scale: [0, 1, 0], rotate: [0, 120], opacity: [0, 1, 0] }}
            transition={{
              duration: 1.4,
              delay: s.delay,
              repeat: Infinity,
              repeatDelay: 1.8,
              ease: "easeInOut",
            }}
          >
            <path d="M12 0 L14.8 9.2 L24 12 L14.8 14.8 L12 24 L9.2 14.8 L0 12 L9.2 9.2 Z" />
          </motion.svg>
        ))}
      <span className="relative z-20 text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">{children}</span>
    </span>
  );
}
