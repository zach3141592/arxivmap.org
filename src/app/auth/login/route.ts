import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const formData = await request.formData();
  const returnTo = formData.get("returnTo") as string | null;
  const supabase = await createClient();

  const callbackUrl = new URL(`${origin}/auth/callback`);
  if (returnTo) {
    callbackUrl.searchParams.set("returnTo", returnTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return NextResponse.redirect(`${origin}?error=auth`);
  }

  return NextResponse.redirect(data.url, { status: 302 });
}
