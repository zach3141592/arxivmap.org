"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarUpload } from "./avatar-upload";

interface ProfileFormProps {
  userId: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

export function ProfileForm({
  email,
  displayName,
  bio,
  avatarUrl,
}: ProfileFormProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [nameValue, setNameValue] = useState(displayName ?? "");
  const [bioValue, setBioValue] = useState(bio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: nameValue, bio: bioValue }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save.");
      return;
    }

    setIsEditing(false);
    router.refresh();
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-500 transition-all hover:border-gray-400 hover:text-gray-800"
      >
        Edit profile
      </button>
    );
  }

  return (
    <div className="w-full space-y-4">
      <AvatarUpload
        avatarUrl={avatarUrl}
        displayName={displayName}
        email={email}
      />

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Display name
          </label>
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            placeholder={email}
            maxLength={80}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Bio
          </label>
          <textarea
            value={bioValue}
            onChange={(e) => setBioValue(e.target.value.slice(0, 500))}
            placeholder="Tell the world about your research interests..."
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
          />
          <p className="mt-0.5 text-right text-[10px] text-gray-400">
            {bioValue.length}/500
          </p>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-gray-900 px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setNameValue(displayName ?? "");
            setBioValue(bio ?? "");
            setError(null);
          }}
          className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-500 transition-all hover:border-gray-400 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
