import { MOCK_AUDIT } from "../data/mocks";

export default function Audit() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-subtitle">Complete action trail across all pipelines</p>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Task</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_AUDIT.map((entry, i) => (
              <tr key={i}>
                <td style={{ color: "var(--text-muted)", fontSize: 13, whiteSpace: "nowrap" }}>
                  {new Date(entry.timestamp).toLocaleString("en", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
                <td>
                  <code style={{
                    background: "var(--bg-secondary)",
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: "monospace",
                    color: entry.action.includes("failed") || entry.action.includes("rejected")
                      ? "var(--accent-red)"
                      : entry.action.includes("completed") || entry.action.includes("passed")
                        ? "var(--accent-green)"
                        : "var(--accent-blue)",
                  }}>
                    {entry.action}
                  </code>
                </td>
                <td style={{ fontSize: 13, color: "var(--text-secondary)", textTransform: "capitalize" }}>
                  {entry.actor}
                </td>
                <td style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "monospace" }}>
                  {entry.taskId}
                </td>
                <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>{entry.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
