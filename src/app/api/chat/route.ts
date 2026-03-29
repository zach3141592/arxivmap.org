import Anthropic from "@anthropic-ai/sdk";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import type { StoredMapData } from "@/lib/paper-map-ai";

const anthropic = new Anthropic();

const NAVIGATE_MAP_TOOL: Anthropic.Tool = {
  name: "navigate_map",
  description:
    "Highlight specific papers on the 3D map and navigate the camera to them. Call this whenever the user asks to show, find, highlight, or navigate to papers on a topic. Pass an empty array to clear all highlights.",
  input_schema: {
    type: "object" as const,
    properties: {
      paper_ids: {
        type: "array",
        items: { type: "string" },
        description: "ArXiv IDs of the papers to highlight",
      },
      topic_label: {
        type: "string",
        description: "Short label for what the user is looking for (e.g. 'reinforcement learning')",
      },
    },
    required: ["paper_ids"],
  },
};

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return new Response("Not configured", { status: 500 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!rateLimit(authData.user.id).ok) {
    return new Response("Too many requests", { status: 429 });
  }

  const { messages, contextId } = await request.json();
  const isMapContext = contextId === "map";

  // Load abstract server-side — never trust client-supplied content in the system prompt
  const serviceClient = createServiceClient();
  let abstract: string;

  if (isMapContext) {
    const { data: mapRow } = await serviceClient
      .from("paper_maps")
      .select("map_data")
      .eq("user_id", authData.user.id)
      .single();

    if (!mapRow?.map_data) {
      abstract = "No map data available.";
    } else {
      const mapData = mapRow.map_data as StoredMapData;
      const allPaperIds = mapData.topics.flatMap((t) => t.paper_ids);
      const { data: papers } = await serviceClient
        .from("paper_summaries")
        .select("arxiv_id, title")
        .eq("user_id", authData.user.id)
        .in("arxiv_id", allPaperIds);

      const paperTitles = new Map((papers ?? []).map((p) => [p.arxiv_id, p.title]));
      const total = allPaperIds.length;
      let ctx = `Paper map with ${total} papers across ${mapData.topics.length} topics:\n`;
      for (const topic of mapData.topics) {
        ctx += `\nTopic: "${topic.label}"\n`;
        for (const id of topic.paper_ids) {
          ctx += `- "${paperTitles.get(id) ?? id}" (${id})\n`;
        }
      }
      abstract = ctx;
    }
  } else if (typeof contextId === "string" && contextId.startsWith("paper:")) {
    const paperId = contextId.slice("paper:".length);
    const { data: paper } = await serviceClient
      .from("paper_summaries")
      .select("abstract")
      .eq("arxiv_id", paperId)
      .eq("user_id", authData.user.id)
      .single();
    abstract = paper?.abstract ?? "Abstract not available.";
  } else {
    return new Response("Bad request", { status: 400 });
  }

  const systemPrompt = isMapContext
    ? `You are a helpful research assistant for a 3D paper map visualization.\n\nThe map contains the following papers:\n\n${abstract}\n\nAnswer questions about these papers. When the user asks to show, find, highlight, or navigate to papers on a specific topic, call the navigate_map tool with the matching arxiv IDs from the list above. When the user asks to clear, reset, or show all papers, call navigate_map with an empty array.\n\nFormat responses with markdown: **bold** for key terms, bullet points for lists.`
    : `You are a helpful research assistant. The user is reading an academic paper with the following abstract:\n\n${abstract}\n\nAnswer their questions about this paper. Be concise and accurate. Format your responses using markdown for readability: use **bold** for key terms, bullet points for lists, numbered lists for steps or sequences, \`code\` for technical terms or equations, and headings (### only) to organize longer answers. Keep answers focused and well-structured.`;

  const streamParams: Anthropic.MessageStreamParams = {
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  };

  if (isMapContext) {
    streamParams.tools = [NAVIGATE_MAP_TOOL];
  }

  const stream = anthropic.messages.stream(streamParams);

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      stream.on("text", (text) => {
        controller.enqueue(encoder.encode(text));
      });
      stream.on("message", (message) => {
        if (isMapContext) {
          const toolUse = message.content.find(
            (b): b is Anthropic.ToolUseBlock =>
              b.type === "tool_use" && b.name === "navigate_map"
          );
          if (toolUse) {
            const sentinel = `\n[__NAVIGATE__]${JSON.stringify(toolUse.input)}[/__NAVIGATE__]`;
            controller.enqueue(encoder.encode(sentinel));
          }
        }
        controller.close();
      });
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        controller.close();
      });
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
