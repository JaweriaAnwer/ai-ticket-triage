import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  reverse?: boolean;
  colorFrom?: string;
  colorTo?: string;
}

export function BorderBeam({
  className,
  size = 64,
  duration = 6,
  delay = 0,
  reverse = false,
  colorFrom = "#9d8df1",
  colorTo = "transparent",
}: BorderBeamProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
    >
      {!reducedMotion && (
        <motion.div
          className={cn(
            "absolute aspect-square bg-gradient-to-l from-[--beam-from] to-[--beam-to]",
            className
          )}
          style={
            {
              width: size,
              offsetPath: `rect(0 auto auto 0 round ${size}px)`,
              "--beam-from": colorFrom,
              "--beam-to": colorTo,
            } as React.CSSProperties
          }
          initial={{ offsetDistance: reverse ? "100%" : "0%" }}
          animate={{ offsetDistance: reverse ? "0%" : "100%" }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration,
            delay: -delay,
          }}
        />
      )}
    </div>
  );
}
