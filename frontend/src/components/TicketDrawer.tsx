import { useState } from "react";
import { X, Network, FileCode, CheckCircle2, AlertTriangle, Loader2, Copy, ExternalLink, EyeOff } from "lucide-react";

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

interface JiraDraft {
  title: string;
  priority: string;
  issue_type: string;
  description: string;
  steps_to_reproduce: string[];
  expected_behavior: string;
  actual_behavior: string;
  suggested_labels: string[];
}

const PRIORITY_COLOR: Record<string, string> = {
  Critical: "text-red-400 bg-red-400/10 border-red-400/20",
  High: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  Medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

export function TicketDrawer({
  isOpen,
  onClose,
  ticket,
  onIgnored,
}: {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onIgnored?: (id: number) => void;
}) {
  const [isDrafting, setIsDrafting] = useState(false);
  const [isIgnoring, setIsIgnoring] = useState(false);
  const [jiraDraft, setJiraDraft] = useState<JiraDraft | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !ticket) return null;

  // ── Ignore ──────────────────────────────────────────────────────────
  const handleIgnore = async () => {
    setIsIgnoring(true);
    try {
      await fetch(`http://localhost:8000/api/tickets/${ticket.id}/ignore`, {
        method: "PATCH",
      });
      onIgnored?.(ticket.id);
      onClose();
    } catch (e) {
      console.error("Failed to ignore ticket:", e);
    } finally {
      setIsIgnoring(false);
    }
  };

  // ── Draft Jira ───────────────────────────────────────────────────────
  const handleDraftJira = async () => {
    setIsDrafting(true);
    setJiraDraft(null);
    try {
      const res = await fetch(`http://localhost:8000/api/tickets/${ticket.id}/draft-jira`, {
        method: "POST",
      });
      const data: JiraDraft = await res.json();
      setJiraDraft(data);
    } catch (e) {
      console.error("Failed to draft Jira issue:", e);
    } finally {
      setIsDrafting(false);
    }
  };

  // ── Copy to Clipboard ────────────────────────────────────────────────
  const handleCopy = () => {
    if (!jiraDraft) return;
    const text = `
**${jiraDraft.title}**
Type: ${jiraDraft.issue_type} | Priority: ${jiraDraft.priority}
Labels: ${jiraDraft.suggested_labels.join(", ")}

**Description:**
${jiraDraft.description}

**Steps to Reproduce:**
${jiraDraft.steps_to_reproduce.map((s, i) => `${i + 1}. ${s}`).join("\n")}

**Expected:** ${jiraDraft.expected_behavior}
**Actual:** ${jiraDraft.actual_behavior}
    `.trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute inset-y-0 right-0 w-[800px] bg-[var(--color-background)] border-l border-[var(--color-border)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">

      {/* Drawer Header */}
      <div className="h-14 border-b border-[var(--color-border)] flex items-center justify-between px-6 bg-[var(--color-surface)]">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-[var(--color-text-secondary)]">T-{ticket.id}</span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 capitalize">{ticket.category}</span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate max-w-[180px]">{ticket.source}</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Raw Ticket */}
        <div className="w-1/2 p-6 border-r border-[var(--color-border)] overflow-y-auto">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-4">Original Report</h3>
          <h2 className="text-xl font-medium mb-2">{ticket.summary || "Incoming Report"}</h2>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mb-6">
            <span>Reported by: </span>
            <span className="font-medium text-[var(--color-text-primary)]">
              {ticket.reporter_name || "Unknown"} ({ticket.reporter_email || "no-email"})
            </span>
            <span>• {new Date(ticket.created_at).toLocaleDateString()}</span>
          </div>
          <div className="prose prose-invert prose-sm whitespace-pre-wrap text-[var(--color-text-secondary)] text-sm leading-relaxed">
            {ticket.raw_content}
          </div>
        </div>

        {/* Right: AI Brain */}
        <div className="w-1/2 bg-[#0a0a0c] p-6 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <Network size={16} className="text-[var(--color-accent)]" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-accent)]">Nova Intelligence</h3>
          </div>

          <div className="space-y-4">
            {/* Categorization */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Categorization</span>
                <span className="text-xs text-[var(--color-accent)] flex items-center gap-1">
                  <CheckCircle2 size={11} /> AI Verified
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Classified as a <span className="font-medium text-[var(--color-text-primary)] capitalize">{ticket.urgency} Urgency</span> {ticket.category}.
                Sentiment score: <span className="font-medium text-[var(--color-text-primary)]">{ticket.sentiment_score?.toFixed(2)}</span>.
              </p>
            </div>

            {/* Semantic Match */}
            <div className="bg-[var(--color-surface)] border border-yellow-500/30 rounded-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-yellow-500" />
                <span className="text-sm font-medium">Semantic Match</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Vector similarity search via pgvector. Click Clusters in the sidebar to see related issues grouped together.
              </p>
            </div>

            {/* Jira Draft Section */}
            {!jiraDraft ? (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileCode size={14} />
                  <span className="text-sm font-medium">Jira Issue Draft</span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Click <strong className="text-white">Draft Jira Issue</strong> below to let the AI generate a full, structured Jira ticket from this report.
                </p>
              </div>
            ) : (
              <div className="bg-[var(--color-surface)] border border-[var(--color-accent)]/30 rounded-md p-4 space-y-3 animate-in fade-in duration-300">
                {/* Title + badges */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-white leading-tight">{jiraDraft.title}</h4>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-white px-2 py-1 rounded border border-[var(--color-border)] hover:border-slate-500 transition-colors shrink-0"
                  >
                    {copied ? <><CheckCircle2 size={11} className="text-emerald-400" /> Copied</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${PRIORITY_COLOR[jiraDraft.priority] ?? ""}`}>
                    {jiraDraft.priority}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                    {jiraDraft.issue_type}
                  </span>
                  {jiraDraft.suggested_labels.map((l) => (
                    <span key={l} className="text-xs px-2 py-0.5 rounded bg-[var(--color-background)] border border-[var(--color-border)] text-slate-400">
                      {l}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{jiraDraft.description}</p>

                <div>
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">Steps to Reproduce</p>
                  <ol className="space-y-1">
                    {jiraDraft.steps_to_reproduce.map((s, i) => (
                      <li key={i} className="text-xs text-[var(--color-text-secondary)] flex gap-2">
                        <span className="text-[var(--color-accent)] shrink-0">{i + 1}.</span> {s}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[var(--color-border)]">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Expected</p>
                    <p className="text-xs text-emerald-400">{jiraDraft.expected_behavior}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Actual</p>
                    <p className="text-xs text-red-400">{jiraDraft.actual_behavior}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer Footer */}
      <div className="h-16 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-end px-6 gap-3">
        <button
          onClick={handleIgnore}
          disabled={isIgnoring}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-red-400 transition-colors disabled:opacity-50"
        >
          {isIgnoring ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />}
          Ignore
        </button>
        <button
          onClick={handleDraftJira}
          disabled={isDrafting}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-accent)] text-white hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-60"
        >
          {isDrafting
            ? <><Loader2 size={14} className="animate-spin" /> Generating...</>
            : jiraDraft
            ? <><ExternalLink size={14} /> Regenerate Draft</>
            : <><FileCode size={14} /> Draft Jira Issue</>
          }
        </button>
      </div>
    </div>
  );
}
