"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "../avatar";

// Resizes/compresses an uploaded image client-side before storing it, so a
// multi-MB phone photo doesn't turn into a huge database row. No upload
// service needed - the result is just stored as a data URI string, which
// is all the existing avatarUrl field expects.
function resizeImage(file: File, maxDimension = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setHandle(data.user.handle);
        setDisplayName(data.user.displayName);
        setBio(data.user.bio || "");
        setAvatarUrl(data.user.avatarUrl || "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Image is too large (max 8MB).");
      return;
    }

    try {
      const resized = await resizeImage(file);
      setAvatarUrl(resized);
    } catch {
      setUploadError("Couldn't process that image - try a different file.");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, bio, avatarUrl }),
    });
    setSaving(false);
    setSaved(true);
  }

  if (loading) return <p style={{ color: "var(--ink-soft)" }}>Loading...</p>;

  return (
    <main className="manuscript" style={{ paddingTop: "2.5rem", maxWidth: 460 }}>
      <h1>Profile</h1>
      <p className="eyebrow">@{handle}</p>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1rem 0" }}>
        <Avatar name={displayName} avatarUrl={avatarUrl} />
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Choose photo
          </button>
          {avatarUrl && (
            <button type="button" onClick={() => setAvatarUrl("")} style={{ marginLeft: "0.5rem" }}>
              Remove
            </button>
          )}
        </div>
      </div>
      {uploadError && <p style={{ color: "var(--accent)" }}>{uploadError}</p>}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        <label>
          <span className="eyebrow">Display name</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={{ width: "100%", display: "block" }} />
        </label>
        <label>
          <span className="eyebrow">Bio</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} style={{ width: "100%", display: "block" }} />
        </label>
        <div>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
          {saved && <span style={{ marginLeft: "0.75rem", color: "var(--ink-soft)" }}>Saved.</span>}
        </div>
      </form>
    </main>
  );
}
