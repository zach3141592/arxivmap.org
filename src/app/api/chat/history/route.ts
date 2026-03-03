import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ messages: [] });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contextId = searchParams.get("contextId");
  if (!contextId) {
    return Response.json({ messages: [] });
  }

  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("chat_conversations")
    .select("messages")
    .eq("user_id", authData.user.id)
    .eq("context_id", contextId)
    .single();

  return Response.json({ messages: data?.messages ?? [] });
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) {
    return new Response("Not configured", { status: 500 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { contextId, messages } = await request.json();
  if (!contextId || !Array.isArray(messages)) {
    return new Response("Bad request", { status: 400 });
  }

  const serviceClient = createServiceClient();
  await serviceClient.from("chat_conversations").upsert({
    user_id: authData.user.id,
    context_id: contextId,
    messages,
    updated_at: new Date().toISOString(),
  });

  return new Response("OK");
}
