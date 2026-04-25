import { TOPICS } from "../../packages/shared/src/constants";

export class SwarmOrchestrator {
  private taskId: string;
  private tenantId: string;
  private eventBus: any;

  constructor(taskId: string, tenantId: string, eventBus: any) {
    this.taskId = taskId;
    this.tenantId = tenantId;
    this.eventBus = eventBus;
  }

  async startProcessing(issue: any) {
    console.log(`[Swarm] Starting Elite Workflow for Task ${this.taskId}`);

    // STEP 1: PLANNER AGENT (Requested via Bus)
    await this.eventBus.publish("PLANNER_REQUESTED", this.tenantId, {
      taskId: this.taskId,
      issue
    });
  }

  async onPlanGenerated(plan: any) {
    console.log(`[Swarm] Plan received. Moving to Context Retrieval.`);
    
    // STEP 2: CONTEXT AGENT (Requested via Bus)
    await this.eventBus.publish("CONTEXT_REQUESTED", this.tenantId, {
      taskId: this.taskId,
      plan
    });
  }

  async onContextResolved(context: any) {
    console.log(`[Swarm] Context resolved. Activating Coding Agent.`);

    // STEP 3: CODING AGENT (Requested via Bus)
    await this.eventBus.publish("CODER_REQUESTED", this.tenantId, {
      taskId: this.taskId,
      context
    });
  }

  async onCodeGenerated(diff: any) {
    console.log(`[Swarm] Code generated. Initiating Quality Review.`);

    // STEP 4: REVIEWER AGENT (Requested via Bus)
    await this.eventBus.publish("REVIEW_REQUESTED", this.tenantId, {
      taskId: this.taskId,
      diff
    });
  }

  async onReviewCompleted(result: any) {
    if (result.status === 'approved') {
      console.log(`[Swarm] Quality Gate PASSED. Initiating PR Creation.`);
      await this.eventBus.publish("PR_CREATION_REQUESTED", this.tenantId, {
        taskId: this.taskId,
        diff: result.diff
      });
    } else {
      console.log(`[Swarm] Review REJECTED. Looping back to Coder with feedback.`);
      await this.eventBus.publish("CODER_REQUESTED", this.tenantId, {
        taskId: this.taskId,
        feedback: result.feedback
      });
    }
  }
}
