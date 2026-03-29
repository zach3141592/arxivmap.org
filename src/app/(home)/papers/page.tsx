import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PaperInput } from "../../paper-input";
import { PapersList } from "./papers-list";

export default async function PapersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const serviceClient = createServiceClient();
  const { data: papers } = await serviceClient
    .from("paper_summaries")
    .select("arxiv_id, title, authors, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <>
      <PaperInput />
      <PapersList papers={papers || []} />
    </>
  );
}
