import { useState, useEffect } from "react";
import { 
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { Activity, AlertTriangle, MessageSquare } from "lucide-react";
import { AnimatedDonutChart } from "../components/AnimatedDonutChart";
import { AnimatedBarChart } from "../components/AnimatedBarChart";
import { AnimatedHorizontalBarChart } from "../components/AnimatedHorizontalBarChart";
import { AnimatedMetricCard } from "../components/AnimatedMetricCard";

interface SummaryData {
  total_tickets: number;
  avg_sentiment: number;
  high_urgency_count: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface VolumeData {
  date: string;
  count: number;
}

// Colors tailored for dark mode aesthetics
const COLORS = ['#cabdff', '#79b7dc', '#e28795', '#d4a373', '#9eb3c2'];

export function Metrics() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [volume, setVolume] = useState<VolumeData[]>([]);
  const [urgency, setUrgency] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const [sumRes, catRes, volRes, urgRes] = await Promise.all([
          fetch("http://localhost:8000/api/analytics/summary"),
          fetch("http://localhost:8000/api/analytics/categories"),
          fetch("http://localhost:8000/api/analytics/volume"),
          fetch("http://localhost:8000/api/analytics/urgency")
        ]);

        setSummary(await sumRes.json());
        setCategories(await catRes.json());
        
        // Format dates for the volume chart
        const rawVolume = await volRes.json();
        const formattedVolume = rawVolume.map((item: any) => ({
          ...item,
          date: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        }));
        setVolume(formattedVolume);
        
        setUrgency(await urgRes.json());
      } catch (error) {
        console.error("Failed to load analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin text-[var(--color-accent)]">
          <Activity size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Metrics & Analytics</h1>
        <p className="text-[var(--color-text-secondary)]">
          Real-time AI triage performance and ticket volume.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-6">
        <AnimatedMetricCard title="Total Volume" value={summary?.total_tickets?.toString() || "0"} trend="Total Processed" icon={<MessageSquare size={18} />} />
        <AnimatedMetricCard title="High Urgency" value={summary?.high_urgency_count?.toString() || "0"} trend="Action Required" icon={<AlertTriangle size={18} className="text-red-400" />} highlight />
        <AnimatedMetricCard title="Avg Sentiment" value={summary?.avg_sentiment?.toFixed(2) || "0.00"} trend="Score out of 1.0" icon={<Activity size={18} className="text-emerald-400" />} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 col-span-2">
          <div className="h-[400px] w-full">
            <AnimatedBarChart 
              data={volume.slice(-7).map(v => ({ label: v.date, value: v.count }))} 
            />
          </div>
        </div>

        <div className="col-span-2 w-full h-[350px]">
          {categories.length > 0 ? (
            <AnimatedDonutChart 
              total={summary?.total_tickets || 0}
              data={categories.map((c, i) => ({ 
                name: c.name, 
                value: c.value, 
                color: COLORS[i % COLORS.length] 
              }))} 
            />
          ) : (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 h-full flex items-center justify-center text-[var(--color-text-secondary)] text-sm">
              No data available
            </div>
          )}
        </div>

        {/* Urgency Bar */}
        <div className="col-span-2 w-full h-[500px] mt-6">
          <AnimatedHorizontalBarChart 
            title="Urgency Distribution"
            data={urgency.map(u => ({
              name: u.name,
              value: u.value,
              color: u.name.toLowerCase() === 'high' ? '#e28795' : u.name.toLowerCase() === 'medium' ? '#d4a373' : '#79b7dc'
            }))} 
          />
        </div>

      </div>
    </div>
  );
}
