import StatusBadge from "../components/StatusBadge";
import { MOCK_METRICS, MOCK_TASKS } from "../data/mocks";

interface OverviewProps {
  onViewTask: (id: string) => void;
}

export default function Overview({ onViewTask }: OverviewProps) {
  const m = MOCK_METRICS;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">AI pipeline performance for the last 7 days</p>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Tasks processed</div>
          <div className="kpi-value">{m.tasks.total}</div>
          <div className="kpi-change positive">+12% vs last week</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Success rate</div>
          <div className="kpi-value" style={{ color: m.tasks.successRate >= 80 ? "var(--accent-green)" : "var(--accent-amber)" }}>
            {m.tasks.successRate}%
          </div>
          <div className="kpi-change positive">+3% vs last week</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">PRs merged</div>
          <div className="kpi-value">{m.pullRequests.merged}</div>
          <div className="kpi-change positive">{m.pullRequests.mergeRate}% merge rate</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cost this period</div>
          <div className="kpi-value">${(m.performance.totalCostCents / 100).toFixed(2)}</div>
          <div className="kpi-change negative">{m.budget.remainingPercent}% budget remaining</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Recent Tasks */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Tasks</h2>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TASKS.slice(0, 5).map((task) => (
                <tr key={task.id} onClick={() => onViewTask(task.id)} style={{ cursor: "pointer" }}>
                  <td>
                    <div className="table-title">#{task.issueNumber} {task.title}</div>
                    <div className="table-subtitle">{task.repository}</div>
                  </td>
                  <td><StatusBadge status={task.status} /></td>
                  <td><span className={`risk-${task.riskLevel}`}>{task.riskLevel}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Budget & Performance */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Budget & Performance</h2>
          </div>

          <div className="progress-container" style={{ marginBottom: 24 }}>
            <div className="progress-label">
              <span style={{ color: "var(--text-secondary)" }}>Monthly budget</span>
              <span style={{ color: "var(--text-muted)" }}>
                ${(m.budget.spentCents / 100).toFixed(0)} / ${(m.budget.monthlyLimitCents / 100).toFixed(0)}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${100 - m.budget.remainingPercent}%` }} />
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Metric</th>
                <th style={{ textAlign: "right" }}>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ color: "var(--text-secondary)" }}>Avg pipeline duration</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>
                  {(m.performance.avgDurationMs / 1000).toFixed(1)}s
                </td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-secondary)" }}>Tasks failed</td>
                <td style={{ textAlign: "right", fontWeight: 600, color: "var(--accent-red)" }}>{m.tasks.failed}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-secondary)" }}>PRs open</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{m.pullRequests.total - m.pullRequests.merged}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-secondary)" }}>Cost per task</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>
                  ${(m.performance.totalCostCents / m.tasks.total / 100).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
