import { useState } from "react";

export default function Settings() {
  const [autonomy, setAutonomy] = useState("auto-pr");
  const [maxRetries, setMaxRetries] = useState(3);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your tenant pipeline behavior</p>
      </div>

      <div className="grid-2">
        {/* Autonomy */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Pipeline Autonomy</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { value: "assisted", label: "Assisted", desc: "AI generates plans, human must approve code and PRs" },
              { value: "auto-pr", label: "Auto PR", desc: "AI creates PRs automatically, human reviews before merge" },
              { value: "auto-merge", label: "Auto Merge", desc: "AI creates and merges PRs for low-risk changes automatically" },
            ].map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${autonomy === opt.value ? "var(--accent-blue)" : "var(--border)"}`,
                  background: autonomy === opt.value ? "rgba(59, 130, 246, 0.08)" : "transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  type="radio"
                  name="autonomy"
                  value={opt.value}
                  checked={autonomy === opt.value}
                  onChange={(e) => setAutonomy(e.target.value)}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Safety */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Safety Limits</h2>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>
              Max auto-fix iterations per task
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="range"
                min={1}
                max={5}
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontWeight: 700, fontSize: 18, minWidth: 24, textAlign: "center" }}>{maxRetries}</span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>
              Blocked modules (no AI edits allowed)
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["auth", "billing", "payment", "security"].map((mod) => (
                <span key={mod} className="badge badge-failed" style={{ fontSize: 11 }}>{mod}</span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>
              API Key
            </label>
            <code style={{
              display: "block",
              background: "var(--bg-secondary)",
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              fontFamily: "monospace",
              color: "var(--text-muted)",
              letterSpacing: 0.5,
            }}>
              ak_dev_test_key_12345
            </code>
          </div>

          <button
            onClick={handleSave}
            style={{
              background: saved ? "var(--accent-green)" : "var(--accent-blue)",
              color: "#fff",
              border: "none",
              padding: "10px 24px",
              borderRadius: "var(--radius-sm)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              width: "100%",
            }}
          >
            {saved ? "Saved" : "Save Settings"}
          </button>
        </div>
      </div>
    </>
  );
}
