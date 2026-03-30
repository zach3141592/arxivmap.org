"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface AvatarUploadProps {
  avatarUrl: string | null;
  displayName: string | null;
  email: string;
  size?: "sm" | "lg";
}

export function AvatarDisplay({
  avatarUrl,
  displayName,
  email,
  size = "lg",
}: AvatarUploadProps) {
  const letter = (displayName || email)?.[0]?.toUpperCase() ?? "?";
  const dim = size === "lg" ? "h-20 w-20 text-2xl" : "h-7 w-7 text-xs";

  return (
    <div
      className={`${dim} shrink-0 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center font-medium text-gray-500`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        letter
      )}
    </div>
  );
}

export function AvatarUpload({
  avatarUrl,
  displayName,
  email,
}: AvatarUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const letter = (displayName || email)?.[0]?.toUpperCase() ?? "?";
  const src = preview ?? avatarUrl;

  async function handleFile(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
    setUploading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed.");
      setPreview(null);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative h-20 w-20 shrink-0 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center font-medium text-2xl text-gray-500 hover:ring-2 hover:ring-gray-300 transition"
        aria-label="Change profile photo"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          letter
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
            <svg
              className="h-5 w-5 animate-spin text-white"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
              />
            </svg>
          </div>
        )}
      </button>
      <span className="text-[10px] text-gray-400">Click to change photo</span>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
