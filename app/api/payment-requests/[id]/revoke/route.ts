import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Please sign in to revoke this link." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("revoke_payment_request_share", {
    p_request_id: id,
  });
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not revoke this link." },
      { status: 400 },
    );
  }

  const { error: clearError } = await supabase.from("payment_requests")
    .update({ owner_share_token: null })
    .eq("id", id)
    .eq("user_id", user.id);
  if (clearError) {
    return NextResponse.json({ error: "The link was revoked, but its saved copy could not be cleared. Refresh and try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
