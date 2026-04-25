import { NextRequest, NextResponse } from "next/server";
import { processIssue } from "@/lib/autonomous-loop";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Only process newly opened issues
    if (payload.action === "opened" && payload.issue) {
      console.log(`[Webhook] New Issue Detected: #${payload.issue.number}`);
      
      // Execute the autonomous loop as an async "Fire and forget" or wait for demo purposes
      // In production, this would go to a background worker
      const pr = await processIssue(payload.issue);
      
      return NextResponse.json({ 
        status: "success", 
        message: "Autonomous loop triggered", 
        pr_url: pr.html_url 
      });
    }

    return NextResponse.json({ status: "ignored" });
  } catch (error: any) {
    console.error("[Webhook] Error:", error.message);
    return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
  }
}
