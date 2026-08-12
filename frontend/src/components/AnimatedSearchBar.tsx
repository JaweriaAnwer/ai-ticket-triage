import { motion } from "framer-motion";
import { Search, Command } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function AnimatedSearchBar() {
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const easeNatural = [0.25, 0.1, 0.25, 1] as const;
  const easeSlowDown = [0.2, 0, 0, 1] as const;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (query.trim()) {
      navigate(`/app?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate(`/app`);
    }
  };

  return (
    <motion.form
      onSubmit={handleSearch}
      initial={{ scale: 0.5, width: "40px", opacity: 0 }}
      animate={{ scale: 1, width: "256px", opacity: 1 }}
      transition={{
        scale: { duration: 0.4, ease: easeSlowDown },
        opacity: { duration: 0.2 },
        width: { duration: 0.7, delay: 0.4, ease: easeNatural },
      }}
      className={`hidden md:flex items-center gap-2 bg-[var(--color-surface)] border rounded-full px-3 py-1.5 text-sm transition-colors overflow-hidden ${
        isFocused
          ? "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/50"
          : "border-[var(--color-border)]"
      }`}
      style={{ borderRadius: "40px" }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: easeSlowDown }}
      >
        <Search
          size={14}
          className={
            isFocused
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-text-secondary)]"
          }
        />
      </motion.div>

      <motion.div
        className="flex-1 flex items-center h-full min-w-0"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.9, ease: easeSlowDown }}
      >
        <input
          type="text"
          placeholder="Search complaints, tickets..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full bg-transparent border-none outline-none text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]"
        />
      </motion.div>

      <motion.div
        className="flex items-center gap-1 opacity-60 shrink-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 0.5, delay: 1.0 }}
      >
        <Command
          size={12}
          className="text-[var(--color-text-secondary)]"
        />
        <span className="text-xs text-[var(--color-text-secondary)]">K</span>
      </motion.div>
    </motion.form>
  );
}