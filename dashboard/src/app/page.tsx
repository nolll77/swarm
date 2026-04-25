"use client";

import { useEffect, useState } from "react";
import { Zap, Activity, GitPullRequest, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [prs, setPrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrs();
    const interval = setInterval(fetchPrs, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchPrs = async () => {
    try {
      const res = await fetch("/api/prs");
      const data = await res.json();
      setPrs(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main className="min-h-screen bg-bg text-text selection:bg-primary/30">
      {/* NAVBAR */}
      <nav className="border-b border-border p-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ rotate: -20, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <Zap className="text-bg w-6 h-6 fill-current" />
          </motion.div>
          <span className="text-2xl font-bold tracking-tighter uppercase font-mono">Amaswarn</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <div className="flex items-center gap-2 text-subtext">
            <span className="w-2 h-2 rounded-full bg-success animate-ping" />
            LIVE SWARM MONITOR
          </div>
          <div className="px-4 py-1.5 bg-surface border border-border rounded-full text-xs font-mono">
            v3.1.0-ELITE
          </div>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto p-8 space-y-12">
        
        {/* METRICS ROW */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard label="Autonomous Issues Fix" value="1.2k" sub="+4 this hour" icon={<Activity className="w-4 h-4" />} />
          <MetricCard label="Active Agents" value="22" sub="Full Swarm Sync" icon={<Zap className="w-4 h-4" />} />
          <MetricCard label="Success Rate" value="99.2%" sub="Verified by AI" icon={<ShieldCheck className="w-4 h-4" />} />
          <MetricCard label="Productivity Gain" value="€42.5k" sub="+12% ROI" icon={<Zap className="w-4 h-4" />} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LIVE ACTIVITY PANEL */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Activity className="text-primary w-5 h-5" /> 
                Flux d'activité Temps Réel
              </h2>
            </div>
            
            <div className="bg-card border border-border rounded-2xl p-6 h-[500px] overflow-hidden relative shadow-inner">
               <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    <ActivityItem key="1" time="Maintenant" agent="orchestrator" msg="Scanning GitHub for new issues..." active />
                    <ActivityItem key="2" time="Il y a 2m" agent="agent-coder" msg="Patch generated for issue #143" />
                    <ActivityItem key="3" time="Il y a 5m" agent="agent-reviewer" msg="PR #88 reviewed and approved" />
                    <ActivityItem key="4" time="Il y a 12m" agent="auto-patcher" msg="Vulnerability fixed in packages/shared" />
                  </AnimatePresence>
               </div>
               <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-card to-transparent pointer-events-none" />
            </div>
          </div>

          {/* PR PANEL */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <GitPullRequest className="text-accent w-5 h-5" />
              PRs Autonomes
            </h2>
            <div className="flex flex-col gap-4">
              {loading ? (
                <div className="p-8 text-center text-subtext animate-pulse">Chargement des flux...</div>
              ) : prs.length === 0 ? (
                <div className="card-premium text-center py-12 text-subtext italic">Aucune PR active. Créez une issue !</div>
              ) : (
                prs.slice(0, 5).map((pr, i) => (
                  <motion.div 
                    key={pr.id}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <PRCard pr={pr} />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value, sub, icon }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-card border border-border rounded-2xl p-6 shadow-xl hover:shadow-primary/5 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-subtext uppercase tracking-widest">{label}</span>
        <div className="p-2 bg-surface rounded-lg text-primary">{icon}</div>
      </div>
      <div className="text-4xl font-bold tracking-tighter mb-1">{value}</div>
      <div className="text-xs text-success font-medium flex items-center gap-1">
        <Zap className="w-3 h-3 fill-current" /> {sub}
      </div>
    </motion.div>
  );
}

function ActivityItem({ time, agent, msg, active }: any) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex gap-4 p-4 rounded-xl border border-transparent transition-all",
        active ? "bg-primary/5 border-primary/20 shadow-lg shadow-primary/5" : "hover:bg-surface/50"
      )}
    >
      <div className={cn(
        "w-2 h-2 mt-2 rounded-full",
        active ? "bg-primary animate-pulse" : "bg-border"
      )} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-accent uppercase tracking-tighter">@{agent}</span>
          <span className="text-[10px] text-subtext opacity-50 uppercase">{time}</span>
        </div>
        <p className={cn("text-sm", active ? "text-text" : "text-subtext")}>{msg}</p>
      </div>
    </motion.div>
  );
}

function PRCard({ pr }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition-colors group">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <span className="text-xs font-mono text-subtext">#{pr.number}</span>
          <div className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-bold uppercase">
            {pr.state}
          </div>
        </div>
        <h4 className="text-sm font-semibold group-hover:text-accent transition-colors line-clamp-1">{pr.title}</h4>
        <div className="flex items-center justify-between text-[11px] text-subtext">
          <span>{pr.user.login}</span>
          <span>{new Date(pr.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
