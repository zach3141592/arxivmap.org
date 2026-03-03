"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

export function ChatPanel({ abstract, contextId }: { abstract: string; contextId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load saved messages on mount
  useEffect(() => {
    if (!contextId) { setLoaded(true); return; }
    fetch(`/api/chat/history?contextId=${encodeURIComponent(contextId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length) setMessages(data.messages);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [contextId]);

  // Save messages after streaming completes
  const saveMessages = useCallback((msgs: Message[]) => {
    if (!contextId || msgs.length === 0) return;
    fetch("/api/chat/history", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contextId, messages: msgs }),
    }).catch(() => {});
  }, [contextId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Auto-resize textarea (no scrollbar, grows upward)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "0";
      inputRef.current.style.height = inputRef.current.scrollHeight + "px";
    }
  }, [input]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, abstract }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        const snapshot = assistantContent;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: snapshot },
        ]);
      }

      const finalMessages = [...updatedMessages, { role: "assistant" as const, content: assistantContent }];
      saveMessages(finalMessages);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function clearChat() {
    setMessages([]);
    if (contextId) {
      fetch("/api/chat/history", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextId, messages: [] }),
      }).catch(() => {});
    }
  }

  return (
    <div className="flex h-full flex-col">
      {messages.length > 0 && !isStreaming && (
        <div className="flex justify-end border-b border-gray-100 px-3 py-1.5">
          <button
            onClick={clearChat}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear chat
          </button>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
        {!loaded ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-gray-300">Loading...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-gray-400">
              Ask a question
            </p>
            <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-gray-300">
              Ask anything about this paper&apos;s methods, results, or implications.
            </p>
          </div>
        ) : null}
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gray-900 px-4 py-2.5 text-sm leading-relaxed text-white">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-gray-50 px-4 py-2.5 text-sm leading-relaxed text-gray-700">
                    {msg.content ? (
                      <div className="chat-markdown">
                        <ReactMarkdown
                          components={{
                            h3: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-semibold text-gray-900 first:mt-0">{children}</h3>,
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                            ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">{children}</ol>,
                            li: ({ children }) => <li className="pl-0.5">{children}</li>,
                            code: ({ className, children }) => {
                              const isBlock = className?.includes("language-");
                              return isBlock ? (
                                <code className="block overflow-x-auto rounded-lg bg-gray-800 p-3 text-xs text-gray-100">{children}</code>
                              ) : (
                                <code className="rounded bg-gray-200 px-1 py-0.5 text-xs font-mono text-gray-800">{children}</code>
                              );
                            },
                            pre: ({ children }) => <pre className="mb-2 last:mb-0">{children}</pre>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-gray-300" />
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-gray-300 [animation-delay:0.2s]" />
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-gray-300 [animation-delay:0.4s]" />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 bg-white p-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-0 rounded-xl border border-gray-200 bg-gray-50 transition-all focus-within:border-gray-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-gray-100">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this paper..."
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none overflow-hidden bg-transparent py-2.5 pl-4 pr-2 text-sm outline-none placeholder:text-gray-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="mb-1.5 mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white transition-all hover:bg-black disabled:opacity-20"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
