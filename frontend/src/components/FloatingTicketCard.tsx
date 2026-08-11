import { motion } from "framer-motion";
import { Sparkles, CheckCircle2 } from "lucide-react";

export function FloatingTicketCard() {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative z-10 max-w-sm w-full mx-auto"
    >
      <motion.div
        animate={{ y: [-5, 5, -5] }}
        transition={{
          repeat: Infinity,
          duration: 4,
          ease: "easeInOut",
        }}
        className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Animated Glow */}
        <motion.div
          animate={{
            x: ["-100%", "200%"],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "linear",
            repeatDelay: 1,
          }}
          className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]"
        />

        <div className="flex items-center gap-3 mb-4">
          <div className="bg-[var(--color-accent)]/20 p-2 rounded-lg text-[var(--color-accent)]">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Nova AI Analysis</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">Ticket instantly classified</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-2 w-3/4 bg-white/10 rounded animate-pulse" />
          <div className="h-2 w-1/2 bg-white/10 rounded animate-pulse delay-75" />
          
          <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-400/10 px-2 py-1 rounded">
              High Urgency
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 size={14} /> Routed
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
