import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, ChevronRight, Clock, MessageSquare, Tag, Zap, Plus, Filter } from "lucide-react";
import { TicketDrawer } from "../components/TicketDrawer";
import { CreateTicketModal } from "../components/CreateTicketModal";
import { AnimatedMetricCard } from "../components/AnimatedMetricCard";
import { API_BASE_URL } from "../lib/api";

interface Ticket {
  id: number;
  source: string;
  reporter_name: string | null;
  reporter_email: string | null;
  raw_content: string;
  category: string;
  sentiment_score: number;
  urgency: string | null;
  summary: string | null;
  status: string;
  created_at: string;
}

const SOURCE_FILTERS = [
  { label: "All Sources", value: "all" },
  { label: "VS Code", value: "microsoft/vscode" },
  { label: "Next.js", value: "vercel/next.js" },
  { label: "Flask (Python)", value: "pallets/flask" },
  { label: "TypeScript", value: "microsoft/TypeScript" },
  { label: "Manual Entry", value: "Manual Entry" },
];

const URGENCY_COLOR: Record<string, string> = {
  high: "text-red-400 bg-red-400/10 border-red-400/20",
  medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

export function Dashboard() {
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q");

  const fetchTickets = () => {
    const url = q ? `${API_BASE_URL}/api/tickets?q=${encodeURIComponent(q)}` : `${API_BASE_URL}/api/tickets`;
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setTickets(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch tickets:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTickets();
  }, [q]);

  // Filter tickets based on selected source
  const filteredTickets = sourceFilter === "all"
    ? tickets
    : tickets.filter(t => t.source.includes(sourceFilter));

  const highUrgencyCount = tickets.filter(t => t.urgency === "high").length;
  const selectedLabel = SOURCE_FILTERS.find(f => f.value === sourceFilter)?.label ?? "All Sources";

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-full relative">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight mb-0.5">Global Inbox</h1>
          <p className="text-[var(--color-text-secondary)] text-xs">Real-time AI triage and classification.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[var(--color-accent)] hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Ticket
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <AnimatedMetricCard title="Total Tickets" value={tickets.length.toString()} trend="Live from API" icon={<MessageSquare size={16} />} />
        <AnimatedMetricCard title="High Urgency" value={highUrgencyCount.toString()} trend="Needs attention" icon={<AlertCircle size={16} className="text-red-400" />} highlight />
        <AnimatedMetricCard title="AI Classified" value={tickets.length.toString()} trend="100% coverage" icon={<CheckCircle2 size={16} className="text-green-500" />} />
      </div>

      {/* Data Table */}
      <div className="flex-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg flex flex-col relative z-10">
        
        {/* Table Header with Source Filter */}
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)] rounded-t-lg relative z-20">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium">Recent Activity</h2>
            <span className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-background)] border border-[var(--color-border)] px-2 py-0.5 rounded">
              {filteredTickets.length} tickets
            </span>
          </div>
          
          {/* Source Dropdown Filter */}
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <Filter size={12} />
              {selectedLabel}
              <ChevronRight size={12} className={`transition-transform ${isFilterOpen ? "rotate-90" : ""}`} />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#1c1f26] border border-[var(--color-border)] rounded-lg shadow-2xl z-50 overflow-hidden">
                {SOURCE_FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => { setSourceFilter(f.value); setIsFilterOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--color-surface-hover)] flex items-center justify-between ${
                      sourceFilter === f.value ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"
                    }`}
                  >
                    {f.label}
                    {sourceFilter === f.value && <CheckCircle2 size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] uppercase tracking-wider bg-[var(--color-background)]/50">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Summary</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Urgency</th>
                <th className="px-4 py-3 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading live data...</td></tr>
              ) : filteredTickets.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">
                  No tickets found for <strong>{selectedLabel}</strong>. Try syncing from the Integrations Hub!
                </td></tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface)] cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)] text-xs">T-{ticket.id}</td>
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors max-w-xs">
                      <span className="truncate block">{ticket.summary || ticket.raw_content.substring(0, 60) + "..."}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] truncate max-w-[140px]">
                        {ticket.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--color-surface-hover)] text-xs border border-[var(--color-border)] capitalize">
                        <Tag size={12} className={ticket.category === "bug" ? "text-red-400" : ticket.category === "feature" ? "text-blue-400" : "text-slate-400"} />
                        {ticket.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ticket.urgency ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${URGENCY_COLOR[ticket.urgency] ?? ""}`}>
                          {ticket.urgency}
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-secondary)] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-secondary)] text-xs whitespace-nowrap">
                      <span className="flex items-center justify-end gap-2">
                        {new Date(ticket.created_at).toLocaleDateString()}
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Drawer */}
      <TicketDrawer 
        ticket={tickets.find(t => t.id === selectedTicketId) || null} 
        isOpen={selectedTicketId !== null} 
        onClose={() => setSelectedTicketId(null)}
        onIgnored={(id) => {
          setTickets(prev => prev.filter(t => t.id !== id));
          setSelectedTicketId(null);
        }}
      />

      <CreateTicketModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchTickets()}
      />
    </div>
  );
}


