import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const formData = await request.formData();
  const returnTo = formData.get("returnTo") as string | null;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.redirect(`${origin}?error=auth`);
  }

  const response = NextResponse.redirect(data.url, { status: 302 });

  // Store returnTo in a cookie so it survives the OAuth redirect
  if (returnTo && returnTo.startsWith("/")) {
    response.cookies.set("returnTo", returnTo, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });
  }

  return response;
}
