import { createClient, createServiceClient } from "@/lib/supabase/server";
import { MapView } from "./map-view";

export default async function MapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const serviceClient = createServiceClient();

  const [{ data: papers }, { data: mapRow }] = await Promise.all([
    serviceClient
      .from("paper_summaries")
      .select("arxiv_id, title, authors, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50),
    serviceClient
      .from("paper_maps")
      .select("map_data, paper_count")
      .eq("user_id", user!.id)
      .single(),
  ]);

  const paperCount = papers?.length ?? 0;
  const mapIsStale = mapRow
    ? mapRow.paper_count !== paperCount
    : paperCount > 0;

  return (
    <MapView
      papers={papers || []}
      cachedMap={mapRow?.map_data ?? null}
      mapIsStale={mapIsStale}
    />
  );
}
