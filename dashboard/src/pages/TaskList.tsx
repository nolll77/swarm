import { useState } from "react";
import StatusBadge from "../components/StatusBadge";
import { MOCK_TASKS } from "../data/mocks";

interface TaskListProps {
  onViewTask: (id: string) => void;
}

export default function TaskList({ onViewTask }: TaskListProps) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all"
    ? MOCK_TASKS
    : MOCK_TASKS.filter((t) => t.status === filter);

  const counts = {
    all: MOCK_TASKS.length,
    completed: MOCK_TASKS.filter((t) => t.status === "completed").length,
    failed: MOCK_TASKS.filter((t) => t.status === "failed").length,
    running: MOCK_TASKS.filter((t) => ["planning", "coding", "reviewing", "fixing", "pr_creating", "ci_monitoring"].includes(t.status)).length,
    pending: MOCK_TASKS.filter((t) => t.status === "pending").length,
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <p className="page-subtitle">All pipeline tasks across your repositories</p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["all", "completed", "failed", "running", "pending"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f === "running" ? "coding" : f)}
            className="nav-item"
            style={{
              width: "auto",
              padding: "8px 16px",
              fontSize: 13,
              background: filter === f || (f === "running" && ["planning", "coding", "reviewing", "fixing", "pr_creating", "ci_monitoring"].includes(filter))
                ? "rgba(59, 130, 246, 0.12)"
                : undefined,
              color: filter === f ? "var(--accent-blue)" : undefined,
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({(counts as any)[f]})
          </button>
        ))}
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Issue</th>
              <th>Repository</th>
              <th>Type</th>
              <th>Risk</th>
              <th>Status</th>
              <th>Iterations</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => (
              <tr key={task.id} onClick={() => onViewTask(task.id)} style={{ cursor: "pointer" }}>
                <td>
                  <div className="table-title">#{task.issueNumber} {task.title}</div>
                </td>
                <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>{task.repository}</td>
                <td>
                  <span className="badge badge-pending" style={{ textTransform: "capitalize" }}>
                    {task.type}
                  </span>
                </td>
                <td><span className={`risk-${task.riskLevel}`} style={{ fontWeight: 600, fontSize: 13 }}>{task.riskLevel}</span></td>
                <td><StatusBadge status={task.status} /></td>
                <td style={{ textAlign: "center", color: "var(--text-muted)" }}>{task.currentIteration}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  {new Date(task.createdAt).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
