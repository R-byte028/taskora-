import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: "Sign in to load your Assistant history." },
      { status: 401, headers: noStoreHeaders },
    );
  }

  const db = supabase as any;
  const { data: conversation, error: conversationError } = await db
    .from("assistant_conversations")
    .select("id,title,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (conversationError) {
    return NextResponse.json(
      { error: "Couldn't load Assistant history." },
      { status: 500, headers: noStoreHeaders },
    );
  }
  if (!conversation) {
    return NextResponse.json(
      { conversationId: null, messages: [] },
      { headers: noStoreHeaders },
    );
  }

  const { data: rows, error: messagesError } = await db
    .from("assistant_messages")
    .select("role,content,created_at")
    .eq("conversation_id", conversation.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  if (messagesError) {
    return NextResponse.json(
      { error: "Couldn't load Assistant messages." },
      { status: 500, headers: noStoreHeaders },
    );
  }

  return NextResponse.json({
    conversationId: conversation.id,
    messages: (rows ?? []).reverse(),
  }, { headers: noStoreHeaders });
}
