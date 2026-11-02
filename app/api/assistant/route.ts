import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ACTIONS = ["workspace_summary", "list_jobs", "list_pending_payments"] as const;
type AssistantAction = (typeof ACTIONS)[number];
type JobStatus = "in_progress" | "completed" | "cancelled";

type AssistantRequest = {
  action?: unknown;
  status?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  let body: AssistantRequest;

  try {
    body = await request.json() as AssistantRequest;
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Send a valid assistant action.", 400);
  }

  const action = body.action;
  if (typeof action !== "string" || !ACTIONS.includes(action as AssistantAction)) {
    return jsonError("That assistant action is not supported.", 400);
  }

  if (action === "list_jobs" && body.status !== undefined &&
      !["in_progress", "completed", "cancelled"].includes(String(body.status))) {
    return jsonError("Choose a valid job status.", 400);
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError("Sign in to use the Taskora Assistant.", 401);
  }

  const headers = { "Cache-Control": "no-store" };

  if (action === "list_jobs") {
    let query = supabase
      .from("jobs")
      .select("id,title,amount,currency,status,completed_at,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (body.status) query = query.eq("status", body.status as JobStatus);

    const { data, error } = await query;
    if (error) return jsonError("Couldn't retrieve your jobs right now.", 500);

    return NextResponse.json({
      action,
      count: data.length,
      jobs: data,
    }, { headers });
  }

  if (action === "list_pending_payments") {
    const { data, error } = await supabase
      .from("payment_requests")
      .select("id,amount,currency,status,work_summary,created_at")
      .eq("status", "shared")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return jsonError("Couldn't retrieve your payment requests right now.", 500);

    return NextResponse.json({
      action,
      count: data.length,
      note: "Shared requests are awaiting payment; they are not proof of an on-chain transfer.",
      paymentRequests: data,
    }, { headers });
  }

  const [{ data: jobs, error: jobsError }, { data: requests, error: requestsError }] = await Promise.all([
    supabase.from("jobs").select("amount,currency,status").limit(500),
    supabase.from("payment_requests").select("status").limit(500),
  ]);

  if (jobsError || requestsError) {
    return jsonError("Couldn't build your workspace summary right now.", 500);
  }

  const jobRows = jobs ?? [];
  const requestRows = requests ?? [];
  const totalFor = (currency: "USDC" | "NEAR", status?: JobStatus) =>
    jobRows
      .filter((job) => job.currency === currency && (!status || job.status === status))
      .reduce((sum, job) => sum + Number(job.amount), 0);

  return NextResponse.json({
    action,
    summary: {
      jobs: jobRows.length,
      activeJobs: jobRows.filter((job) => job.status === "in_progress").length,
      completedJobs: jobRows.filter((job) => job.status === "completed").length,
      cancelledJobs: jobRows.filter((job) => job.status === "cancelled").length,
      paymentRequests: requestRows.length,
      sharedPaymentRequests: requestRows.filter((item) => item.status === "shared").length,
      completedJobValue: {
        USDC: totalFor("USDC", "completed"),
        NEAR: totalFor("NEAR", "completed"),
      },
    },
    limitations: [
      "USDC and NEAR totals are kept separate.",
      "A shared payment request is not a confirmed payment.",
      "Only verified on-chain evidence may be used to mark a request paid.",
    ],
  }, { headers });
}
