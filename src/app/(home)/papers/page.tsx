import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PapersSection } from "./papers-section";

export default async function PapersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const serviceClient = createServiceClient();
  const { data: papers } = await serviceClient
    .from("paper_summaries")
    .select("arxiv_id, title, authors, created_at, starred")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(500);

  return <PapersSection papers={papers || []} />;
}
