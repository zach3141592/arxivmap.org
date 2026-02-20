import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const returnTo = searchParams.get("returnTo");
      if (returnTo && returnTo.startsWith("/")) {
        return NextResponse.redirect(`${origin}${returnTo}`);
      }
      return NextResponse.redirect(origin);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}?error=auth`);
}
