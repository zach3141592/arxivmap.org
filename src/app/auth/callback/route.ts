import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const cookieStore = await cookies();
      const returnTo = cookieStore.get("returnTo")?.value;

      const response = NextResponse.redirect(
        returnTo && returnTo.startsWith("/")
          ? `${origin}${returnTo}`
          : origin
      );

      // Clear the cookie
      response.cookies.delete("returnTo");

      return response;
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}?error=auth`);
}
