import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function summarizePaper(abstract: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a research paper summarizer. Given the following academic paper abstract, write a clear and accessible 2-3 paragraph summary that explains the key contributions, methodology, and findings. Write for a technical audience but aim for clarity.

Abstract:
${abstract}`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type === "text") {
    return block.text;
  }
  throw new Error("Unexpected response from Claude");
}
