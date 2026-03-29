"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PaperMap } from "@/components/paper-map";
import type { StoredMapData } from "@/lib/paper-map-ai";

interface Paper {
  arxiv_id: string;
  title: string;
  authors?: string;
  created_at: string | null;
}

export function MapView({
  papers,
  cachedMap,
  mapIsStale,
}: {
  papers: Paper[];
  cachedMap: StoredMapData | null;
  mapIsStale: boolean;
}) {
  const [liveMap, setLiveMap] = useState<StoredMapData | null>(null);
  const [mapProgress, setMapProgress] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapGenerated = useRef(false);

  const currentMap = liveMap ?? cachedMap;
  const needsGeneration = mapIsStale || !currentMap;

  const generateMap = useCallback(async () => {
    if (mapGenerated.current) return;
    mapGenerated.current = true;
    setMapProgress("Preparing...");
    setMapError(null);

    try {
      const res = await fetch("/api/paper-map", { method: "POST" });
      if (!res.ok) {
        setMapError("Failed to generate map");
        setMapProgress(null);
        mapGenerated.current = false;
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const chunk of lines) {
          const eventMatch = chunk.match(/event: (\w+)\ndata: ([\s\S]*)/);
          if (!eventMatch) continue;
          const [, event, data] = eventMatch;

          if (event === "progress") {
            const { step } = JSON.parse(data);
            setMapProgress(step);
          } else if (event === "complete") {
            setLiveMap(JSON.parse(data));
            setMapProgress(null);
          } else if (event === "error") {
            setMapError("Failed to generate map");
            setMapProgress(null);
            mapGenerated.current = false;
          }
        }
      }
    } catch {
      setMapError("Failed to generate map");
      setMapProgress(null);
      mapGenerated.current = false;
    }
  }, []);

  useEffect(() => {
    if (needsGeneration && papers.length > 0 && !mapProgress) {
      generateMap();
    }
  }, [needsGeneration, papers.length, mapProgress, generateMap]);

  if (mapProgress) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
        <p className="text-sm text-gray-400">{mapProgress}</p>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-400">{mapError}</p>
        <button
          onClick={() => { mapGenerated.current = false; generateMap(); }}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="-mx-4 sm:-mx-6">
      <div className="h-[calc(100vh-80px)] min-h-[500px]">
        <PaperMap papers={papers} cachedMap={currentMap} />
      </div>
    </div>
  );
}
