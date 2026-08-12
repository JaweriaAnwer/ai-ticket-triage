import { useState, useEffect } from "react";
import { Zap, ExternalLink, Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { API_BASE_URL } from "../lib/api";
export function Automations() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  useEffect(() => {
    // Load existing webhook URL on mount
    fetch(`${API_BASE_URL}/api/integrations/n8n/webhook`)
      .then(res => res.json())
      .then(data => {
        if (data.webhook_url) setWebhookUrl(data.webhook_url);
      })
      .catch(console.error);
  }, []);
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch(`${API_BASE_URL}/api/integrations/n8n/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: webhookUrl })
      });
      if (res.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };
  const handleTest = async () => {
    setIsTesting(true);
    setTestStatus("idle");
    try {
      const res = await fetch(`${API_BASE_URL}/api/integrations/n8n/test`, {
        method: "POST"
      });
      if (res.ok) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
      }
    } catch {
      setTestStatus("error");
    } finally {
      setIsTesting(false);
    }
  };
  return (
    <div className="p-8 max-w-4xl w-full mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Automations with n8n</h1>
        <p className="text-[var(--color-text-secondary)] text-sm">
          Nova uses n8n to power robust, visual workflow automations. 
          Hook up your n8n instance to route tickets, send emails, or escalate issues automatically.
        </p>
      </div>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 relative overflow-hidden shrink-0">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="flex items-start gap-6 relative z-10">
          <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.15)] shrink-0">
            <Zap size={32} className="text-orange-500" />
          </div>
          
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Configure n8n Webhook</h2>
              <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                Paste your n8n Webhook URL below. Whenever a new ticket is ingested or synced, Nova will instantly fire a POST request to this URL containing the ticket data (urgency, sentiment, category, etc.).
              </p>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] block">
                n8n Webhook URL
              </label>
              <div className="flex gap-3">
                <input 
                  type="url"
                  placeholder="http://localhost:5678/webhook/nova-triage"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="flex-1 bg-black/40 border border-[var(--color-border)] rounded-md px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-slate-600"
                />
                <button 
                  onClick={handleSave}
                  disabled={isSaving || !webhookUrl}
                  className="bg-[var(--color-background)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-white px-5 py-2.5 rounded-md text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save
                </button>
              </div>
              {saveStatus === "success" && <p className="text-xs text-emerald-400 flex items-center gap-1 mt-2"><CheckCircle2 size={12}/> Webhook URL saved successfully!</p>}
              {saveStatus === "error" && <p className="text-xs text-red-400 flex items-center gap-1 mt-2"><AlertCircle size={12}/> Failed to save webhook URL.</p>}
            </div>
            <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white mb-1">Test your connection</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">Fires a mock ticket payload to your configured URL.</p>
              </div>
              <button 
                onClick={handleTest}
                disabled={isTesting || !webhookUrl}
                className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors shadow-[0_0_15px_rgba(249,115,22,0.3)] disabled:opacity-50 flex items-center gap-2"
              >
                {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                Test Webhook
              </button>
            </div>
            
            {testStatus === "success" && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-400 leading-relaxed">
                  Success! The test payload was delivered to your n8n workflow. Check your n8n dashboard to view the execution.
                </p>
              </div>
            )}
            {testStatus === "error" && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-start gap-2">
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-400 leading-relaxed">
                  Failed to reach the webhook URL. Ensure n8n is running locally and the workflow is active or listening for test events.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Guide */}
      <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl p-6 shrink-0">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          How to set up n8n <a href="http://localhost:5678" target="_blank" rel="noreferrer" className="text-orange-500 hover:text-orange-400 transition-colors"><ExternalLink size={16} /></a>
        </h3>
        <ol className="space-y-4 text-sm text-[var(--color-text-secondary)]">
          <li className="flex gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-white text-xs font-bold shrink-0">1</span>
            <p>Make sure n8n is running locally on your machine by running <code className="text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">npx n8n</code> in your terminal.</p>
          </li>
          <li className="flex gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-white text-xs font-bold shrink-0">2</span>
            <p>Open <a href="http://localhost:5678" target="_blank" rel="noreferrer" className="text-white underline underline-offset-2">localhost:5678</a> and create a new workflow.</p>
          </li>
          <li className="flex gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-white text-xs font-bold shrink-0">3</span>
            <p>Add a <strong>Webhook</strong> trigger node. Set the HTTP Method to <strong>POST</strong>.</p>
          </li>
          <li className="flex gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-white text-xs font-bold shrink-0">4</span>
            <p>Copy the "Test URL" provided by the Webhook node, paste it into the field above, and click <strong>Test Webhook</strong>.</p>
          </li>
        </ol>
      </div>
    </div>
  );
}
