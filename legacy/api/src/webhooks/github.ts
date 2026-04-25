import { Request, Response } from "express";
import { taskQueue } from "../services/queue";

export async function handleGithubEvent(req: Request, res: Response) {
  const event = req.headers["x-github-event"];
  const payload = req.body;

  if (event === "issues") {
    // Only process newly opened issues
    if (payload.action === "opened") {
      const tenantId = payload.installation.id;
      
      await taskQueue.add("process-issue", {
        tenantId,
        repo: payload.repository.full_name,
        issueNumber: payload.issue.number,
        title: payload.issue.title,
        body: payload.issue.body
      });

      console.log(`Enqueued task for issue #${payload.issue.number} in ${payload.repository.full_name}`);
    }
  }

  return res.status(202).send("Accepted");
}
