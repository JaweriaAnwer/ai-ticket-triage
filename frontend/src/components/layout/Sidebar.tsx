import { Inbox, LayoutGrid, Settings, GitPullRequest, Activity } from "lucide-react";
import { NavLink } from "react-router-dom";
import { AnimatedLogo } from "../AnimatedLogo";

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-3xl flex flex-col z-10 relative">
      {/* Logo Area */}
      <div className="h-14 w-full border-b border-[var(--color-border)] relative">
        <AnimatedLogo />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-1">
        <p className="px-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Triage</p>
        <NavItem to="/app" end icon={<Inbox size={16} />} label="Inbox" />
        <NavItem to="/app/clusters" icon={<LayoutGrid size={16} />} label="Clusters" badge="3" />
        
        <p className="px-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mt-6 mb-2">Engineering</p>
        <NavItem to="/app/automations" icon={<GitPullRequest size={16} />} label="Automations" />
        <NavItem to="/app/metrics" icon={<Activity size={16} />} label="Metrics" />
      </nav>

      {/* User / Settings */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <NavItem to="/app/settings" icon={<Settings size={16} />} label="Settings" />
      </div>
    </aside>
  );
}

function NavItem({ icon, label, to, end, badge }: { icon: React.ReactNode; label: string; to: string; end?: boolean; badge?: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
        isActive 
          ? "bg-[var(--color-surface)] text-[var(--color-text-primary)]" 
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      {badge && (
        <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </NavLink>
  );
}
