import { Octokit } from "@octokit/rest";
import { NextResponse } from "next/server";

export async function GET() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const owner = process.env.GITHUB_OWNER || "nolll77";
  const repo = process.env.GITHUB_REPO || "swarm";

  try {
    const { data: prs } = await octokit.pulls.list({
      owner,
      repo,
      state: "open",
    });

    return NextResponse.json(prs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
