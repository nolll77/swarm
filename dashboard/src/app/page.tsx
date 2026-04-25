import { Activity, ShieldCheck, Zap, Server, Code, GitPullRequest } from "lucide-react";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background text-text-primary">
      {/* 4.3 SECTION BLOCK & NAVBAR */}
      <nav className="border-b border-border p-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="text-background w-5 h-5 fill-current" />
          </div>
          <span className="text-h3 font-semibold tracking-tight uppercase">Amaswarn</span>
        </div>
        <div className="flex items-center gap-6 text-small text-text-secondary">
          <span>REPO: nolll77/swarm</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>SYSTEM ONLINE</span>
          </div>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto p-96 flex flex-col gap-32">
        {/* 6.2 METRICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-24">
          <MetricCard label="Tasks Completed" value="1,248" subtext="+12% MoM" />
          <MetricCard label="Active Agents" value="22" subtext="All systems nominal" />
          <MetricCard label="CI Success Rate" value="99.4%" subtext="Last 30 days" />
          <MetricCard label="Cost Savings" value="€34,512" subtext="MTD" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-32">
          {/* 6.3 LIVE ACTIVITY PANEL */}
          <section className="lg:col-span-2 flex flex-col gap-24">
            <h2 className="text-h2 font-medium">Flux d'activités</h2>
            <div className="card-premium h-[500px] overflow-auto flex flex-col gap-4 font-mono text-small">
              <LogEntry time="10:35:01" agent="agent-planner" msg="RCA Analysis initiated for PR #42" type="info" />
              <LogEntry time="10:34:55" agent="agent-coder" msg="Diff generated for billing-stripe fix" type="info" />
              <LogEntry time="10:34:48" agent="agent-reviewer" msg="Security check PASSED" type="success" />
              <LogEntry time="10:34:30" agent="auto-patcher" msg="CVE-2026-1234 detected in shared-pkg" type="danger" />
              <LogEntry time="10:34:12" agent="multi-cloud" msg="Provisioning resource on Scaleway PAR2" type="info" />
            </div>
          </section>

          {/* 6.4 AGENTS GRID (Sidebar style) */}
          <section className="flex flex-col gap-24">
            <h2 className="text-h2 font-medium">Agents Swarm</h2>
            <div className="grid grid-cols-1 gap-16">
              <AgentCard name="Orchestrator" status="running" task="Event Routing" />
              <AgentCard name="Agent-Coder" status="running" task="Patching core.ts" />
              <AgentCard name="Agent-Reviewer" status="idle" task="Waiting for diff" />
              <AgentCard name="SRE-Agent" status="success" task="Last RCA logged" />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <div className="card-premium flex flex-col gap-8">
      <span className="text-small text-text-secondary uppercase tracking-wider">{label}</span>
      <span className="text-h2 font-semibold">{value}</span>
      <span className="text-small text-success">{subtext}</span>
    </div>
  );
}

function LogEntry({ time, agent, msg, type }: { time: string; agent: string; msg: string; type: 'info' | 'success' | 'danger' }) {
  const colors = {
    info: 'text-brand-primary',
    success: 'text-success',
    danger: 'text-danger',
  };
  return (
    <div className="border-b border-border/50 pb-2 flex gap-4">
      <span className="text-text-secondary opacity-50">[{time}]</span>
      <span className="text-accent">@{agent}</span>
      <span className={colors[type] || 'text-text-primary'}>{msg}</span>
    </div>
  );
}

function AgentCard({ name, status, task }: { name: string; status: 'running' | 'idle' | 'success'; task: string }) {
  const statusColors = {
    running: 'bg-primary',
    idle: 'bg-text-secondary',
    success: 'bg-success',
  };
  return (
    <div className="p-4 bg-surface/50 border border-border rounded-lg flex items-center justify-between">
      <div className="flex flex-col">
        <span className="font-medium text-primary text-small">{name}</span>
        <span className="text-[12px] text-text-secondary">{task}</span>
      </div>
      <div className={`w-2 h-2 rounded-full ${statusColors[status] || 'bg-text-secondary'}`} />
    </div>
  );
}
