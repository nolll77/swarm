interface PipelineVisualizerProps {
  currentStep: string;
  status: string;
}

const STEPS = ["triage", "plan", "code", "review", "pr", "ci"];

const STEP_ORDER: Record<string, number> = {
  pending: -1,
  triaging: 0,
  planning: 1,
  coding: 2,
  reviewing: 3,
  fixing: 2,
  pr_creating: 4,
  ci_monitoring: 5,
  completed: 6,
  failed: -2,
};

export default function PipelineVisualizer({ currentStep, status }: PipelineVisualizerProps) {
  const currentIndex = STEP_ORDER[currentStep] ?? -1;
  const isFailed = status === "failed";

  return (
    <div className="pipeline-timeline">
      {STEPS.map((step, i) => {
        let circleClass = "";
        if (isFailed && i === currentIndex) circleClass = "failed";
        else if (i < currentIndex || status === "completed") circleClass = "done";
        else if (i === currentIndex) circleClass = "active";

        return (
          <div className="pipeline-step" key={step}>
            <div className={`step-circle ${circleClass}`}>
              {circleClass === "done" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : circleClass === "failed" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className="step-label">{step}</span>
          </div>
        );
      })}
    </div>
  );
}
