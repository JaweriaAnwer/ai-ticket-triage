import { useState } from "react";
import { Database, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { FloatingTicketCard } from "../components/FloatingTicketCard";
import { API_BASE_URL } from "../lib/api";

interface Integration {
  id: string;
  name: string;
  repo: string;
  description: string;
  color: string;
  iconColor: string;
  logo: React.ReactNode;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "vscode",
    name: "VS Code",
    repo: "microsoft/vscode",
    description: "Import real issues from the world's most popular code editor — bugs, features, and questions from millions of developers.",
    color: "#007ACC",
    iconColor: "bg-[#007ACC]",
    logo: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 19.907V4.093a1.5 1.5 0 0 0-.85-1.506zM18.21 19.912l-6.965-6.63L18.21 6.67v13.242z"/>
      </svg>
    ),
  },
  {
    id: "nextjs",
    name: "Next.js",
    repo: "vercel/next.js",
    description: "Pull in real framework bugs and feature requests from the most widely used React framework in production.",
    color: "#000000",
    iconColor: "bg-[#111]",
    logo: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 0 1-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 0 0-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 0 0-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 0 1-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 0 1-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 0 1 .174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 0 0 4.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 0 0 2.466-2.163 11.944 11.944 0 0 0 2.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 0 0-2.499-.523A33.119 33.119 0 0 0 11.573 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 0 1 .237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 0 1 .233-.296c.096-.05.13-.054.5-.054z"/>
      </svg>
    ),
  },
  {
    id: "flask",
    name: "Flask",
    repo: "pallets/flask",
    description: "Ingest real Python web framework issues — routing bugs, extension problems, and feature requests from the Flask community.",
    color: "#000000",
    iconColor: "bg-[#1a1a1a]",
    logo: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14.085 2.681c-1.172-.8-2.93-1.04-4.617-.48C8.235 2.626 7.16 3.68 6.38 4.81c-.88 1.267-1.44 2.8-1.413 4.373.013.8.2 1.6.613 2.28.414.693 1.08 1.2 1.84 1.4.72.187 1.48.053 2.173-.213.694-.267 1.32-.693 1.907-1.16.24-.2.48-.413.72-.627-.347.587-.653 1.2-.867 1.84-.213.64-.306 1.307-.2 1.96.107.64.44 1.253.96 1.64.52.387 1.2.52 1.84.44.64-.08 1.253-.373 1.8-.72.547-.347 1.04-.76 1.493-1.2.907-.88 1.68-1.907 2.2-3.04.52-1.133.773-2.373.72-3.6-.053-1.227-.373-2.44-.96-3.52-.587-1.08-1.453-2-2.52-2.72l.4-.6zM9.2 14.481c-.32 0-.64-.027-.946-.093.72-.44 1.36-1 1.893-1.627.534-.627.96-1.347 1.2-2.12.08-.267.134-.547.16-.827-.08.107-.16.213-.254.307-.613.64-1.413 1.12-2.28 1.28-.866.16-1.773-.027-2.52-.52-.746-.494-1.28-1.28-1.493-2.12-.213-.84-.12-1.747.213-2.56.254-.627.64-1.2 1.107-1.68-.64.547-1.187 1.213-1.6 1.96-.413.747-.68 1.573-.773 2.413-.08.827.013 1.68.307 2.48.293.8.8 1.52 1.467 2.053.666.534 1.493.84 2.333.893l.187.16z"/>
      </svg>
    ),
  },
  {
    id: "typescript",
    name: "TypeScript",
    repo: "microsoft/TypeScript",
    description: "Monitor the TypeScript compiler for real language bugs, type system edge cases, and feature proposals from engineers worldwide.",
    color: "#3178C6",
    iconColor: "bg-[#3178C6]",
    logo: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/>
      </svg>
    ),
  },
];

interface SyncState {
  status: "idle" | "syncing" | "success" | "error";
  imported: number;
}

export function Settings() {
  const [syncStates, setSyncStates] = useState<Record<string, SyncState>>(
    Object.fromEntries(INTEGRATIONS.map(i => [i.id, { status: "idle", imported: 0 }]))
  );

  const handleSync = async (integration: Integration) => {
    setSyncStates(prev => ({ ...prev, [integration.id]: { status: "syncing", imported: 0 } }));

    try {
      const res = await fetch(`${API_BASE_URL}/api/integrations/github/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository: integration.repo, limit: 5 })
      });

      const data = await res.json();

      if (res.ok) {
        setSyncStates(prev => ({ ...prev, [integration.id]: { status: "success", imported: data.imported } }));
      } else {
        setSyncStates(prev => ({ ...prev, [integration.id]: { status: "error", imported: 0 } }));
      }
    } catch {
      setSyncStates(prev => ({ ...prev, [integration.id]: { status: "error", imported: 0 } }));
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--color-accent)]/20 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex-1 relative z-10">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-3">Integrations Hub</h1>
          <p className="text-[var(--color-text-secondary)] text-lg max-w-lg leading-relaxed">
            Connect Nova to your real-world engineering platforms. Sync live issues, and watch as our AI instantly classifies, prioritizes, and clusters them.
          </p>
        </div>
        
        <div className="flex-1 w-full max-w-sm relative z-10">
          <FloatingTicketCard />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {INTEGRATIONS.map((integration) => {
          const state = syncStates[integration.id];
          return (
            <div
              key={integration.id}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 relative overflow-hidden group hover:border-slate-600 transition-colors"
            >
              {/* Glow effect */}
              <div
                className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"
                style={{ backgroundColor: integration.color }}
              />

              {/* Header */}
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className={`p-2.5 ${integration.iconColor} rounded-lg shadow-sm border border-white/10`}>
                  {integration.logo}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{integration.name}</h2>
                  <code className="text-xs text-[var(--color-text-secondary)] font-mono">{integration.repo}</code>
                </div>
                <div className="ml-auto">
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                    Active
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-[var(--color-text-secondary)] mb-5 relative z-10 leading-relaxed">
                {integration.description}
              </p>

              {/* Sync Button */}
              <button
                onClick={() => handleSync(integration)}
                disabled={state.status === "syncing"}
                className="w-full flex items-center justify-center gap-2 bg-[var(--color-background)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] py-2 rounded-md text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
              >
                {state.status === "syncing" ? (
                  <><Loader2 size={14} className="animate-spin" /> Syncing with AI analysis...</>
                ) : (
                  <><Database size={14} /> Sync Latest 5 Issues</>
                )}
              </button>

              {/* Status feedback */}
              {state.status === "success" && (
                <div className="mt-3 flex items-center justify-between text-xs text-emerald-400 bg-emerald-400/10 p-2.5 rounded-md border border-emerald-400/20 relative z-10 animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} />
                    {state.imported > 0
                      ? `${state.imported} new issue${state.imported > 1 ? "s" : ""} imported and analyzed`
                      : "Already up to date — no new issues found"}
                  </div>
                  <a href="/app" className="font-medium hover:text-emerald-300 underline underline-offset-2 transition-colors">
                    View in Inbox &rarr;
                  </a>
                </div>
              )}
              {state.status === "error" && (
                <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-400/10 p-2.5 rounded-md border border-red-400/20 relative z-10 animate-in fade-in zoom-in-95">
                  <AlertCircle size={14} />
                  Sync failed — check your network or GitHub rate limits.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
