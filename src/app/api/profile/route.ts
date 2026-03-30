import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("user_profiles")
    .select("display_name, bio, avatar_url")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  return NextResponse.json(data ?? { display_name: null, bio: null, avatar_url: null });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { display_name, bio } = body;

  if (bio !== undefined && bio !== null && bio.length > 500) {
    return NextResponse.json({ error: "Bio must be 500 characters or less" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (display_name !== undefined) update.display_name = display_name || null;
  if (bio !== undefined) update.bio = bio || null;

  const serviceClient = createServiceClient();
  await serviceClient
    .from("user_profiles")
    .upsert({ user_id: authData.user.id, ...update }, { onConflict: "user_id" });

  return NextResponse.json({ ok: true });
}
