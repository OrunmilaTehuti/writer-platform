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

  if (loading) return <p>Loading projects...</p>;

  return (
    <main style={{ maxWidth: 700, margin: "2rem auto", fontFamily: "sans-serif", padding: "0 1rem" }}>
      <p>
        <Link href="/">← Back to feed</Link>
      </p>
      <h1>My Projects</h1>

      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem" }}>
        <input
          placeholder="Project title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="BLOG">Blog</option>
          <option value="SCREENPLAY">Screenplay</option>
          <option value="ACADEMIC">Academic</option>
        </select>
        <button type="submit" disabled={creating || !title.trim()}>
          {creating ? "Creating..." : "New Project"}
        </button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {pendingInvites.length > 0 && (
        <div style={{ marginBottom: "1.5rem", padding: "0.75rem", background: "#f7f7f7", borderRadius: 4 }}>
          <h3>Pending invites</h3>
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

      <h3>Your projects</h3>
      {owned.length === 0 && <p style={{ color: "#666" }}>No projects yet - create one above.</p>}
      {owned.map((d) => (
        <p key={d.id}>
          <Link href={`/editor/${d.id}`}>{d.title}</Link> <span style={{ color: "#888" }}>({d.format.toLowerCase()})</span>
        </p>
      ))}

      {collaboratingOn.length > 0 && (
        <>
          <h3>Collaborating on</h3>
          {collaboratingOn.map((d) => (
            <p key={d.id}>
              <Link href={`/editor/${d.id}`}>{d.title}</Link>{" "}
              <span style={{ color: "#888" }}>
                ({d.format.toLowerCase()}, owned by {d.owner?.displayName})
              </span>
            </p>
          ))}
        </>
      )}
    </main>
  );
}
