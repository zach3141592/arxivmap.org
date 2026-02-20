import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function summarizePaper(abstract: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a research paper summarizer. Given the following academic paper abstract, produce a structured summary using the exact format below. Use markdown headings (##) and bullet points (-). Be concise — each bullet should be one sentence. Write for a technical audience but aim for clarity.

## Key Contributions
- ...
- ...

## Methodology
- ...
- ...

## Findings
- ...
- ...

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
