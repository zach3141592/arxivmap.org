import { createServiceClient } from "@/lib/supabase/server";

const EXEMPT_EMAILS = new Set(["zach@traverse.so", "zyu31415@gmail.com"]);
export const DAILY_TOKEN_LIMIT = 10_000;

export async function checkTokenLimit(
  userId: string,
  email: string | undefined
): Promise<{ ok: boolean; used: number }> {
  if (email && EXEMPT_EMAILS.has(email)) return { ok: true, used: 0 };

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const serviceClient = createServiceClient();

  const { data } = await serviceClient
    .from("user_token_usage")
    .select("tokens_used")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  const used = data?.tokens_used ?? 0;
  return { ok: used < DAILY_TOKEN_LIMIT, used };
}

export async function recordTokenUsage(
  userId: string,
  email: string | undefined,
  tokens: number
): Promise<void> {
  if ((email && EXEMPT_EMAILS.has(email)) || tokens <= 0) return;

  const today = new Date().toISOString().slice(0, 10);
  const serviceClient = createServiceClient();

  await serviceClient.rpc("increment_token_usage", {
    p_user_id: userId,
    p_date: today,
    p_tokens: tokens,
  });
}
