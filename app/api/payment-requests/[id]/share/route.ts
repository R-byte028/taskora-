import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Please sign in to access this link." }, { status: 401 });

  const { data, error } = await supabase.rpc("get_active_payment_request_share", {
    p_request_id: id,
  });
  const activeShare = !error ? data?.[0] : undefined;

  if (error || !activeShare?.share_token) {
    return NextResponse.json({
      error: "There is no active link to copy. It may have expired or been revoked; create a fresh link before sharing again.",
    }, { status: 409 });
  }

  const shareUrl = new URL(`/pay/${activeShare.share_token}`, request.url).toString();
  return NextResponse.json({ shareUrl, expiresAt: activeShare.expires_at }, {
    headers: { "Cache-Control": "no-store, private" },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Please sign in to create a share link." }, { status: 401 });

  const token = randomBytes(32).toString("base64url");
  const { data: expiresAt, error } = await supabase.rpc("create_payment_request_share", {
    p_request_id: id,
    p_token: token,
  });
  if (error || !expiresAt) {
    return NextResponse.json({ error: error?.message ?? "Couldn't create the secure link." }, { status: 400 });
  }

  const shareUrl = new URL(`/pay/${token}`, request.url).toString();
  return NextResponse.json({ shareUrl, expiresAt }, { headers: { "Cache-Control": "no-store, private" } });
}
