import Anthropic from "@anthropic-ai/sdk";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const anthropic = new Anthropic();

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

  const { messages, abstract } = await request.json();

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: `You are a helpful research assistant. The user is reading an academic paper with the following abstract:\n\n${abstract}\n\nAnswer their questions about this paper. Be concise and accurate. Format your responses using markdown for readability: use **bold** for key terms, bullet points for lists, numbered lists for steps or sequences, \`code\` for technical terms or equations, and headings (### only) to organize longer answers. Keep answers focused and well-structured.`,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      stream.on("text", (text) => {
        controller.enqueue(encoder.encode(text));
      });
      stream.on("end", () => {
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
