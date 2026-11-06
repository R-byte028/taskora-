import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

type ChatMessage = { role: "user" | "assistant"; content: string };
type JobStatus = "in_progress" | "completed" | "cancelled";

const MODEL = process.env.AI_GATEWAY_MODEL || "alibaba/qwen-3-32b";
const SYSTEM_PROMPT = `You are Taskora Assistant, a practical workspace assistant for freelancers and clients.
Answer clearly and naturally. Use the available tools whenever the user asks about their actual Taskora jobs, payments, or workspace figures. Never invent account data.
Important financial rules:
- USDC and NEAR are different assets; never add their values together.
- A shared payment request is not a completed or verified payment.
- Job values are not proof that money was received.
- You are read-only. Never claim to create, edit, cancel, release, or transfer funds.
- If asked to create a payment request, explain that the user must review and submit it through the Taskora payment-request form.
- Do not request wallet secrets, seed phrases, passwords, or private keys.
Keep replies concise and helpful.`;

const tools = [
  {
    type: "function",
    function: {
      name: "workspace_summary",
      description: "Get counts and completed job values for the signed-in user's Taskora workspace.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_jobs",
      description: "List the signed-in user's jobs, optionally filtered by status.",
      parameters: {
        type: "object",
        properties: { status: { type: "string", enum: ["in_progress", "completed", "cancelled"] } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_pending_payments",
      description: "List shared payment requests awaiting payment. Shared does not mean paid.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
] as const;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function runTool(
  name: string,
  rawArguments: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(rawArguments || "{}") as Record<string, unknown>;
  } catch {
    return { error: "Invalid tool arguments." };
  }

  if (name === "list_jobs") {
    const status = args.status;
    if (status !== undefined && !["in_progress", "completed", "cancelled"].includes(String(status))) {
      return { error: "Unsupported job status." };
    }

    let query = supabase
      .from("jobs")
      .select("id,title,amount,currency,status,completed_at,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (status) query = query.eq("status", status as JobStatus);

    const { data, error } = await query;
    if (error) throw new Error("Couldn't retrieve jobs.");
    return { count: data.length, jobs: data };
  }

  if (name === "list_pending_payments") {
    const { data, error } = await supabase
      .from("payment_requests")
      .select("id,amount,currency,status,work_summary,created_at")
      .eq("status", "shared")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Couldn't retrieve payment requests.");
    return {
      count: data.length,
      note: "Shared requests are awaiting payment and are not proof of an on-chain transfer.",
      paymentRequests: data,
    };
  }

  if (name === "workspace_summary") {
    const [{ data: jobs, error: jobsError }, { data: requests, error: requestsError }] = await Promise.all([
      supabase.from("jobs").select("amount,currency,status").limit(500),
      supabase.from("payment_requests").select("status").limit(500),
    ]);
    if (jobsError || requestsError) throw new Error("Couldn't build the workspace summary.");

    const jobRows = jobs ?? [];
    const requestRows = requests ?? [];
    const totalFor = (currency: "USDC" | "NEAR") =>
      jobRows.filter((job) => job.currency === currency && job.status === "completed")
        .reduce((sum, job) => sum + Number(job.amount), 0);

    return {
      jobs: jobRows.length,
      activeJobs: jobRows.filter((job) => job.status === "in_progress").length,
      completedJobs: jobRows.filter((job) => job.status === "completed").length,
      cancelledJobs: jobRows.filter((job) => job.status === "cancelled").length,
      paymentRequests: requestRows.length,
      sharedPaymentRequests: requestRows.filter((item) => item.status === "shared").length,
      completedJobValue: { USDC: totalFor("USDC"), NEAR: totalFor("NEAR") },
      note: "USDC and NEAR totals are separate job values, not confirmed payments.",
    };
  }

  return { error: "That tool is not available." };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return errorResponse("Sign in to use Taskora Assistant.", 401);

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  // Vercel Functions expose the deployment OIDC token on the incoming request header.
  // Keep the env fallback for local development where `vercel env pull` supplies it.
  const oidcToken = request.headers.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN;
  if (!apiKey && !oidcToken) {
    return errorResponse("Taskora Assistant AI is not configured yet. Add AI Gateway authentication to the Vercel project environment.", 503);
  }

  let body: { messages?: unknown; conversationId?: unknown };
  try {
    body = await request.json() as { messages?: unknown };
  } catch {
    return errorResponse("Send a valid chat request.", 400);
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 12) {
    return errorResponse("Send between 1 and 12 recent chat messages.", 400);
  }

  const messages: ChatMessage[] = [];
  for (const item of body.messages) {
    if (!item || typeof item !== "object") return errorResponse("Invalid chat message.", 400);
    const message = item as Record<string, unknown>;
    if ((message.role !== "user" && message.role !== "assistant") ||
        typeof message.content !== "string" || message.content.length > 3000) {
      return errorResponse("Chat messages must contain a user or assistant role and up to 3,000 characters.", 400);
    }
    messages.push({ role: message.role, content: message.content });
  }
  if (messages[messages.length - 1].role !== "user") {
    return errorResponse("The latest chat message must be from the user.", 400);
  }

  if (body.conversationId !== undefined &&
      body.conversationId !== null &&
      (typeof body.conversationId !== "string" ||
       !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.conversationId))) {
    return errorResponse("Invalid Assistant conversation.", 400);
  }

  const db = supabase as any;
  let conversationId = typeof body.conversationId === "string" ? body.conversationId : null;

  if (conversationId) {
    const { data: existingConversation, error: lookupError } = await db
      .from("assistant_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (lookupError || !existingConversation) {
      return errorResponse("Assistant conversation not found.", 404);
    }
  } else {
    const firstPrompt = messages[messages.length - 1].content;
    const { data: createdConversation, error: createError } = await db
      .from("assistant_conversations")
      .insert({ user_id: user.id, title: firstPrompt.slice(0, 120) || "New conversation" })
      .select("id")
      .single();
    if (createError || !createdConversation) {
      return errorResponse("Couldn't start an Assistant conversation.", 500);
    }
    conversationId = createdConversation.id;
  }

  const latestUserMessage = messages[messages.length - 1].content;
  const { error: saveUserError } = await db
    .from("assistant_messages")
    .insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: latestUserMessage });
  if (saveUserError) return errorResponse("Couldn't save your message. Please try again.", 500);

  const gatewayMessages: Array<Record<string, unknown>> = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);

  try {
    const authorization = apiKey || oidcToken;
    for (let step = 0; step < 4; step++) {
      const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authorization}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: gatewayMessages,
          tools,
          tool_choice: "auto",
          max_tokens: 700,
          temperature: 0.3,
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return errorResponse("AI Gateway authentication failed. Check the Vercel AI Gateway connection.", 502);
        }
        if (response.status === 429) {
          return errorResponse("Taskora Assistant is receiving too many requests. Please try again shortly.", 429);
        }
        return errorResponse("The AI service is temporarily unavailable. Please try again.", 502);
      }

      const result = await response.json() as {
        choices?: Array<{
          message?: {
            role?: string;
            content?: string | null;
            tool_calls?: Array<{
              id: string;
              type: "function";
              function: { name: string; arguments: string };
            }>;
          };
          finish_reason?: string;
        }>;
      };
      const assistantMessage = result.choices?.[0]?.message;
      if (!assistantMessage) return errorResponse("The AI service returned an empty response.", 502);

      if (!assistantMessage.tool_calls?.length) {
        const reply = assistantMessage.content?.trim() || "I couldn't form a response. Please try asking another way.";
        const { error: saveAssistantError } = await db
          .from("assistant_messages")
          .insert({ conversation_id: conversationId, user_id: user.id, role: "assistant", content: reply.slice(0, 3000) });
        if (saveAssistantError) {
          return errorResponse("Your reply was generated, but couldn't be saved to Assistant history.", 500);
        }
        await db.from("assistant_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId)
          .eq("user_id", user.id);
        return NextResponse.json({
          reply,
          model: MODEL,
          conversationId,
        }, { headers: { "Cache-Control": "no-store" } });
      }

      gatewayMessages.push({
        role: "assistant",
        content: assistantMessage.content ?? null,
        tool_calls: assistantMessage.tool_calls,
      });

      for (const call of assistantMessage.tool_calls) {
        const allowed = ["workspace_summary", "list_jobs", "list_pending_payments"].includes(call.function.name);
        const output = allowed
          ? await runTool(call.function.name, call.function.arguments, supabase)
          : { error: "That tool is not available." };
        gatewayMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(output),
        });
      }
    }

    return errorResponse("The Assistant reached its tool-use limit. Please narrow your request and try again.", 502);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return errorResponse("The Assistant took too long to respond. Please try again.", 504);
    }
    return errorResponse("Something went wrong while contacting Taskora Assistant.", 500);
  } finally {
    clearTimeout(timeout);
  }
}
