"use client";

import { useState, useRef, useEffect } from "react";

export function ThreeDotMenu({
  onRename,
  onEdit,
  onDownload,
  onDelete,
}: {
  onRename: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className="rounded-lg px-1.5 py-1 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-500"
      >
        <span className="text-sm leading-none tracking-widest">&middot;&middot;&middot;</span>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-10 w-36 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg shadow-gray-100/50">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onRename(); }}
            className="w-full px-3.5 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Rename
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onEdit(); }}
            className="w-full px-3.5 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onDownload(); }}
            className="w-full px-3.5 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Download
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onDelete(); }}
            className="w-full px-3.5 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function downloadJSON(filename: string, data: Record<string, unknown>) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
