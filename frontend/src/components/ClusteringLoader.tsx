import { motion } from "framer-motion";

export function ClusteringLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-32 h-32 mb-8 perspective-[1000px]">
        <motion.div
          animate={{ rotateY: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="w-full h-full preserve-3d"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* We'll simulate the isometric cubes clustering with floating boxes */}
          {[...Array(9)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: (i % 3 - 1) * 60, 
                y: Math.floor(i / 3 - 1) * 60, 
                z: (Math.random() - 0.5) * 100 
              }}
              animate={{
                x: (i % 3 - 1) * 20, 
                y: Math.floor(i / 3 - 1) * 20, 
                z: 0,
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
                delay: i * 0.1,
              }}
              className="absolute top-1/2 left-1/2 -ml-3 -mt-3 w-6 h-6 bg-[var(--color-accent)]/80 border border-white/20 rounded shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              style={{ transformStyle: "preserve-3d" }}
            />
          ))}
        </motion.div>
      </div>
      <p className="font-medium text-white mb-1">Running Semantic Analysis</p>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Computing cosine distances to discover hidden clusters...
      </p>
    </div>
  );
}
