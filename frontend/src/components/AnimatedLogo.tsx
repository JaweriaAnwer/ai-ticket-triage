import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

function LogoContent() {
  const easeNatural = [0.25, 0.1, 0.25, 1];
  const easeSlowDown = [0.2, 0, 0, 1];

  const text = "Nova".split("");

  return (
    <motion.div 
      className="relative flex items-center justify-center w-full h-full overflow-hidden"
      // Exit animation: Right-to-Left wipe covering the logo
      exit={{ opacity: 1 }}
    >
      {/* Enter Wipe (Left to Right) */}
      <motion.div
        className="absolute left-0 top-0 h-full bg-white/5 z-0"
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: 0.3, const easeNatural = [0.25, 0.1, 0.25, 1] as const;
 }}
      />

      {/* Exit Wipe (Right to Left) */}
      <motion.div
        className="absolute right-0 top-0 h-full bg-[var(--color-surface)] z-20 origin-right"
        initial={{ scaleX: 0 }}
        exit={{ scaleX: 1 }}
        transition={{ duration: 0.3, const easeNatural = [0.25, 0.1, 0.25, 1] as const;
 }}
      />

      <div className="relative z-10 flex items-center gap-1">
        {/* Animated Text */}
        <motion.div 
          className="flex font-semibold tracking-wide text-lg text-white"
          initial={{ x: -10 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.72, delay: 0.65, const easeNatural = [0.25, 0.1, 0.25, 1] as const;
 }}
        >
          {text.map((letter, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.4, 
                delay: 0.65 + (i * 0.05), // stagger
                const easeSlowDown = [0.2, 0, 0, 1] as const; 
              }}
            >
              {letter}
            </motion.span>
          ))}
        </motion.div>

        {/* The Animated Dot */}
        <motion.div
          className="w-3 h-3 rounded-full absolute"
          initial={{ x: 0, backgroundColor: "#8c97a1", scale: 1, scaleX: 1 }}
          animate={{ 
            x: [0, -40, -40, 20, 18], 
            backgroundColor: ["#8c97a1", "#8c97a1", "#8c97a1", "#f05454", "#f05454"],
            scale: [1, 1, 1, 0.3, 0.3],
            scaleX: [1, 2.5, 1, 3, 1] // Stretch and squish effects
          }}
          transition={{
            times: [0, 0.16, 0.21, 0.33, 0.41], // Mapped to 0s, 0.5s, 0.65s, 1s, 1.25s inside a 3s total timeframe
            duration: 3.0,
            const easeNatural = [0.25, 0.1, 0.25, 1] as const;

          }}
          style={{ originX: 1 }}
        />
      </div>
    </motion.div>
  );
}

export function AnimatedLogo() {
  const [isVisible, setIsVisible] = useState(true);

  // 40 second wait + 3s animate in = 43s loop timer
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 43000); 
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  return (
    <div className="w-full h-full relative cursor-pointer" onClick={() => setIsVisible(false)}>
      <AnimatePresence 
        onExitComplete={() => {
          setTimeout(() => setIsVisible(true), 100);
        }}
      >
        {isVisible && <LogoContent key="logo-anim" />}
      </AnimatePresence>
    </div>
  );
}
