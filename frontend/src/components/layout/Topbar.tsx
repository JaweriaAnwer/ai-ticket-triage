import { Bell, Search, Command } from "lucide-react";
import { AnimatedSearchBar } from "../AnimatedSearchBar";

export function Topbar() {
  return (
    <header className="h-14 border-b border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-3xl flex items-center justify-between px-6 shrink-0 relative z-10">
      
      {/* Search / Breadcrumbs */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">Acme Corp</span>
        <span className="text-[var(--color-text-secondary)]">/</span>
        <span className="text-sm font-medium">Inbox</span>
      </div>

      {/* Global Actions */}
      <div className="flex items-center gap-4">
        <AnimatedSearchBar />

        <button className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors relative">
          <Bell size={18} />
          <span className="absolute 0 right-0 w-2 h-2 bg-[var(--color-accent)] rounded-full border-2 border-[var(--color-background)]"></span>
        </button>

        <div className="w-8 h-8 rounded-full bg-slate-700 border border-[var(--color-border)] overflow-hidden">
          <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix" alt="User" className="w-full h-full object-cover opacity-80" />
        </div>
      </div>

    </header>
  );
}
