import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      let destination = new URL("/", origin);

      // Resolve the requested path, then explicitly reject any cross-origin target.
      if (next.startsWith("/") && !next.startsWith("//")) {
        try {
          const candidate = new URL(next, origin);
          if (candidate.origin === origin) destination = candidate;
        } catch {
          // Keep the safe home-page fallback for malformed redirect values.
        }
      }

      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(new URL("/login?error=confirmation", origin));
}
