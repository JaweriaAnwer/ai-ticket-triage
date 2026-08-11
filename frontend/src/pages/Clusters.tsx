import { useState, useEffect } from "react";
import { LayoutGrid, AlertTriangle, Tag, Globe, ChevronDown, ChevronRight, Zap, RefreshCw, Users } from "lucide-react";
import { AnimatedMetricCard } from "../components/AnimatedMetricCard";

interface ClusterTicket {
  id: number;
  summary: string;
  category: string;
  urgency: string | null;
  source: string;
  reporter_name: string | null;
  created_at: string;
}

interface Cluster {
  id: string;
  label: string;
  dominant_category: string;
  dominant_urgency: string;
  ticket_count: number;
  sources: string[];
  tickets: ClusterTicket[];
}

const URGENCY_STYLE: Record<string, { bar: string; badge: string; text: string }> = {
  high:   { bar: "bg-red-500",    badge: "text-red-400 bg-red-400/10 border-red-400/20",     text: "text-red-400"   },
  medium: { bar: "bg-yellow-500", badge: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", text: "text-yellow-400" },
  low:    { bar: "bg-emerald-500",badge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", text: "text-emerald-400" },
};

const CAT_STYLE: Record<string, string> = {
  bug:      "text-red-400",
  feature:  "text-blue-400",
  question: "text-purple-400",
  spam:     "text-slate-500",
};

export function Clusters() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchClusters = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/clusters");
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data: Cluster[] = await res.json();
      setClusters(data);
      // Auto-expand first cluster
      if (data.length > 0) setExpanded(new Set([data[0].id]));
    } catch (e: any) {
      setError(e.message || "Failed to load clusters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClusters(); }, []);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalTickets = clusters.reduce((sum, c) => sum + c.ticket_count, 0);
  const criticalClusters = clusters.filter(c => c.dominant_urgency === "high").length;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white mb-0.5">Issue Clusters</h1>
          <p className="text-[var(--color-text-secondary)] text-xs">
            Semantically grouped tickets powered by <span className="font-mono text-[var(--color-accent)]">pgvector</span> cosine similarity &amp; Union-Find.
          </p>
        </div>
        <button
          onClick={fetchClusters}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <AnimatedMetricCard title="Total Clusters" value={clusters.length.toString()} trend="Discovered" icon={<LayoutGrid size={16} />} />
        <AnimatedMetricCard title="Critical Clusters" value={criticalClusters.toString()} trend="High Urgency" icon={<AlertTriangle size={16} className="text-red-400" />} highlight />
        <AnimatedMetricCard title="Clustered Tickets" value={totalTickets.toString()} trend="Grouped" icon={<Users size={16} />} />
      </div>

      {/* Cluster List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-[var(--color-accent)]/20 border-t-[var(--color-accent)] animate-spin" />
          </div>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Running pgvector cosine similarity search...
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-400">{error}</div>
      ) : clusters.length === 0 ? (
        <div className="space-y-6">
          <div className="text-center py-12 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
            <LayoutGrid size={40} className="mx-auto mb-4 opacity-30" />
            <p className="font-semibold text-white mb-2">No Cross-Platform Clusters Detected</p>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto">
              None of your current tickets from different sources describe the same underlying problem.
              Clusters appear when, for example, a payment bug is reported in both Zendesk <em>and</em> GitHub.
            </p>
          </div>

          {/* Explanation cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" /> What triggers a cluster?
              </h3>
              <ul className="text-sm text-[var(--color-text-secondary)] space-y-1.5 list-disc list-inside">
                <li>Same auth bug reported on GitHub AND Zendesk</li>
                <li>A crash appearing in Next.js AND Flask issues</li>
                <li>A payment failure in Intercom AND email tickets</li>
                <li>Same error message across multiple platforms</li>
              </ul>
            </div>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <RefreshCw size={14} className="text-[var(--color-accent)]" /> How to generate clusters
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                Sync more tickets from multiple sources in the <strong className="text-white">Integrations Hub</strong>. The more diverse your data, the more cross-platform patterns emerge.
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] font-mono bg-[var(--color-background)] px-3 py-1.5 rounded border border-[var(--color-border)]">
                Settings → Integrations Hub → Sync
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {clusters.map((cluster, idx) => {
            const isExpanded = expanded.has(cluster.id);
            const urg = URGENCY_STYLE[cluster.dominant_urgency] ?? URGENCY_STYLE.low;
            return (
              <div
                key={cluster.id}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden hover:border-slate-600 transition-colors"
              >
                {/* Urgency accent bar */}
                <div className={`h-0.5 w-full ${urg.bar}`} />

                {/* Cluster Header — clickable to expand */}
                <button
                  onClick={() => toggleExpand(cluster.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  {/* Cluster number */}
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-center text-xs font-mono text-[var(--color-text-secondary)] shrink-0">
                    {String(idx + 1).padStart(2, "0")}
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-[var(--color-text-secondary)]">{cluster.id}</span>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${urg.text}`}>
                        {cluster.dominant_urgency}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white truncate">{cluster.label}</p>
                  </div>

                  {/* Meta badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-xs border capitalize ${urg.badge}`}>
                      {cluster.dominant_urgency}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] capitalize flex items-center gap-1">
                      <Tag size={10} className={CAT_STYLE[cluster.dominant_category]} />
                      {cluster.dominant_category}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-secondary)] flex items-center gap-1">
                      <Zap size={10} /> {cluster.ticket_count} tickets
                    </span>
                    {isExpanded
                      ? <ChevronDown size={16} className="text-[var(--color-text-secondary)]" />
                      : <ChevronRight size={16} className="text-[var(--color-text-secondary)]" />
                    }
                  </div>
                </button>

                {/* Expanded Ticket List */}
                {isExpanded && (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-background)]">
                    {/* Sources strip */}
                    <div className="px-6 py-2 border-b border-[var(--color-border)] flex items-center gap-2">
                      <Globe size={12} className="text-[var(--color-text-secondary)]" />
                      <span className="text-xs text-[var(--color-text-secondary)]">Sources:</span>
                      {cluster.sources.map(src => (
                        <span key={src} className="text-xs px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] truncate max-w-[180px]">
                          {src}
                        </span>
                      ))}
                    </div>

                    {/* Ticket rows */}
                    <div className="divide-y divide-[var(--color-border)]/50">
                      {cluster.tickets.map(ticket => {
                        const tu = URGENCY_STYLE[ticket.urgency ?? "low"] ?? URGENCY_STYLE.low;
                        return (
                          <div key={ticket.id} className="flex items-center gap-4 px-6 py-3 hover:bg-[var(--color-surface)] transition-colors">
                            <span className="font-mono text-xs text-[var(--color-text-secondary)] shrink-0 w-10">T-{ticket.id}</span>
                            <p className="flex-1 text-sm text-[var(--color-text-primary)] truncate">{ticket.summary}</p>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] border capitalize ${tu.badge}`}>
                                {ticket.urgency}
                              </span>
                              <span className={`text-xs capitalize ${CAT_STYLE[ticket.category]}`}>
                                {ticket.category}
                              </span>
                              <span className="text-xs text-[var(--color-text-secondary)]">
                                {ticket.reporter_name || "Unknown"}
                              </span>
                              <span className="text-xs text-[var(--color-text-secondary)]">
                                {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : "—"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
