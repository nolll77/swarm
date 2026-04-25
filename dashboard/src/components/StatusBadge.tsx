interface StatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { className: string; label: string }> = {
  completed: { className: "badge-completed", label: "Completed" },
  failed: { className: "badge-failed", label: "Failed" },
  planning: { className: "badge-running", label: "Planning" },
  coding: { className: "badge-running", label: "Coding" },
  reviewing: { className: "badge-running", label: "Reviewing" },
  fixing: { className: "badge-running", label: "Fixing" },
  pr_creating: { className: "badge-running", label: "Creating PR" },
  ci_monitoring: { className: "badge-running", label: "CI Running" },
  pending: { className: "badge-pending", label: "Pending" },
  triaging: { className: "badge-pending", label: "Triaging" },
  cancelled: { className: "badge-failed", label: "Cancelled" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { className: "badge-pending", label: status };

  return (
    <span className={`badge ${config.className}`}>
      <span className="badge-dot" />
      {config.label}
    </span>
  );
}
