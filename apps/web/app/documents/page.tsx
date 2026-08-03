"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DocSummary {
  id: string;
  title: string;
  format: string;
  updatedAt: string;
  owner?: { displayName: string };
}

interface PendingInvite {
  id: string;
  document: { id: string; title: string; format: string; owner: { displayName: string } };
}

const FORMAT_ICON: Record<string, string> = {
  SCREENPLAY: "🎬",
  BLOG: "📝",
  ACADEMIC: "🎓",
};

export default function DocumentsPage() {
  const [owned, setOwned] = useState<DocSummary[]>([]);
  const [collaboratingOn, setCollaboratingOn] = useState<DocSummary[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState("BLOG");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/documents");
    if (res.ok) {
      const data = await res.json();
      setOwned(data.owned);
      setCollaboratingOn(data.collaboratingOn);
      setPendingInvites(data.pendingInvites);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, format }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setTitle("");
      load();
    }
    setCreating(false);
  }

  async function respondToInvite(collabId: string, accept: boolean) {
    const res = await fetch(`/api/collaborations/${collabId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
    if (res.ok) load();
  }

  if (loading) return <p style={{ color: "var(--ink-soft)" }}>Loading projects...</p>;

  return (
    <main className="manuscript" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
      <h1>My Projects</h1>

      <form onSubmit={handleCreate} className="card" style={{ padding: "1rem", marginBottom: "1.75rem", display: "flex", gap: "0.5rem" }}>
        <input
          placeholder="Project title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ flex: 1 }}
        />
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="BLOG">Blog</option>
          <option value="SCREENPLAY">Screenplay</option>
          <option value="ACADEMIC">Academic</option>
        </select>
        <button type="submit" className="primary" disabled={creating || !title.trim()}>
          {creating ? "Creating..." : "New Project"}
        </button>
      </form>
      {error && <p style={{ color: "var(--accent)" }}>{error}</p>}

      {pendingInvites.length > 0 && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1.75rem" }}>
          <h3 className="eyebrow">Pending invites</h3>
          {pendingInvites.map((inv) => (
            <div key={inv.id} style={{ marginBottom: "0.5rem" }}>
              <span>
                <strong>{inv.document.owner.displayName}</strong> invited you to collaborate on{" "}
                <em>{inv.document.title}</em> ({inv.document.format.toLowerCase()})
              </span>{" "}
              <button onClick={() => respondToInvite(inv.id, true)}>Accept</button>{" "}
              <button onClick={() => respondToInvite(inv.id, false)}>Decline</button>
            </div>
          ))}
        </div>
      )}

      <h3 className="eyebrow">Your projects</h3>
      {owned.length === 0 && <p style={{ color: "var(--ink-soft)" }}>No projects yet - create one above.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        {owned.map((d) => (
          <Link href={`/editor/${d.id}`} key={d.id} className="card" style={{ padding: "1rem", textDecoration: "none" }}>
            <div style={{ fontSize: "1.6rem" }}>{FORMAT_ICON[d.format] || "📄"}</div>
            <div style={{ fontWeight: 600, marginTop: "0.4rem" }}>{d.title}</div>
            <div className="eyebrow" style={{ marginTop: "0.2rem" }}>{d.format.toLowerCase()}</div>
          </Link>
        ))}
      </div>

      {collaboratingOn.length > 0 && (
        <>
          <h3 className="eyebrow">Collaborating on</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
            {collaboratingOn.map((d) => (
              <Link href={`/editor/${d.id}`} key={d.id} className="card" style={{ padding: "1rem", textDecoration: "none" }}>
                <div style={{ fontSize: "1.6rem" }}>{FORMAT_ICON[d.format] || "📄"}</div>
                <div style={{ fontWeight: 600, marginTop: "0.4rem" }}>{d.title}</div>
                <div className="eyebrow" style={{ marginTop: "0.2rem" }}>
                  {d.format.toLowerCase()} · owned by {d.owner?.displayName}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
