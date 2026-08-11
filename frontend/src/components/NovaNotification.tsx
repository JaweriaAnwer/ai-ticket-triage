import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface NovaNotificationProps {
  message: string;
  isVisible: boolean;
}

export function NovaNotification({ message, isVisible }: NovaNotificationProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -50, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <div className="bg-[#f0f0f0] text-black rounded-[24px] px-4 py-2 shadow-2xl flex items-center gap-3 w-max max-w-sm">
            <div className="bg-[var(--color-accent)] w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm">
              <Zap size={20} className="text-white fill-white" />
            </div>
            <div className="pr-2">
              <h4 className="font-semibold text-[15px] leading-tight">Nova AI</h4>
              <p className="text-[15px] leading-tight text-gray-700">{message}</p>
            </div>
            <span className="text-xs text-gray-400 self-start mt-1 absolute right-4">now</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
