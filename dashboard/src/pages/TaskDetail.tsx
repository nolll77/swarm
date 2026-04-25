import StatusBadge from "../components/StatusBadge";
import PipelineVisualizer from "../components/PipelineVisualizer";
import { MOCK_TASKS, MOCK_EXECUTIONS } from "../data/mocks";

interface TaskDetailProps {
  taskId: string | null;
  onBack: () => void;
}

export default function TaskDetail({ taskId, onBack }: TaskDetailProps) {
  const task = MOCK_TASKS.find((t) => t.id === taskId) || MOCK_TASKS[0];

  return (
    <>
      <div className="page-header">
        <button onClick={onBack} className="card-action" style={{ marginBottom: 12, display: "inline-block" }}>
          &larr; Back to Tasks
        </button>
        <h1 className="page-title">#{task.issueNumber} {task.title}</h1>
        <p className="page-subtitle">{task.repository} -- {task.type} -- {task.riskLevel} risk</p>
      </div>

      {/* Status + Pipeline */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Pipeline Progress</h2>
          <StatusBadge status={task.status} />
        </div>
        <PipelineVisualizer currentStep={task.status} status={task.status} />
        <div style={{ display: "flex", gap: 32, marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>
          <span>Iterations: <strong style={{ color: "var(--text-primary)" }}>{task.currentIteration}</strong></span>
          <span>Created: <strong style={{ color: "var(--text-primary)" }}>{new Date(task.createdAt).toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Execution Timeline */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Execution Log</h2>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{MOCK_EXECUTIONS.length} steps</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Step</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Cost</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_EXECUTIONS.map((exec, i) => (
              <tr key={i}>
                <td style={{ textTransform: "capitalize", fontWeight: 600 }}>{exec.step.replace("_", " ")}</td>
                <td><StatusBadge status={exec.status === "success" ? "completed" : "failed"} /></td>
                <td style={{ color: "var(--text-secondary)" }}>{(exec.durationMs / 1000).toFixed(1)}s</td>
                <td style={{ color: "var(--text-secondary)" }}>${(exec.costCents / 100).toFixed(2)}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  {new Date(exec.createdAt).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 32,
          paddingTop: 16,
          marginTop: 8,
          borderTop: "1px solid var(--border)",
          fontSize: 13,
        }}>
          <span style={{ color: "var(--text-muted)" }}>
            Total duration: <strong style={{ color: "var(--text-primary)" }}>
              {(MOCK_EXECUTIONS.reduce((s, e) => s + e.durationMs, 0) / 1000).toFixed(1)}s
            </strong>
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            Total cost: <strong style={{ color: "var(--text-primary)" }}>
              ${(MOCK_EXECUTIONS.reduce((s, e) => s + e.costCents, 0) / 100).toFixed(2)}
            </strong>
          </span>
        </div>
      </div>
    </>
  );
}
