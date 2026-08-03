"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "../avatar";

interface BlogDoc {
  id: string;
  title: string;
  updatedAt: string;
  owner: { displayName: string; handle: string; avatarUrl: string | null };
}

export default function BloggersPage() {
  const [docs, setDocs] = useState<BlogDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bloggers")
      .then((res) => res.json())
      .then((data) => setDocs(data.docs || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="manuscript" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
      <h1>Bloggers</h1>
      <p style={{ color: "var(--ink-soft)" }}>Published blog posts from writers on Scribes Meet.</p>

      {loading && <p style={{ color: "var(--ink-soft)" }}>Loading...</p>}
      {!loading && docs.length === 0 && (
        <p style={{ color: "var(--ink-soft)" }}>No published posts yet - be the first to publish one.</p>
      )}

      {docs.map((d) => (
        <Link
          key={d.id}
          href={`/bloggers/${d.id}`}
          className="card"
          style={{ display: "flex", gap: "0.75rem", padding: "1rem", marginBottom: "0.75rem", textDecoration: "none" }}
        >
          <Avatar name={d.owner.displayName} avatarUrl={d.owner.avatarUrl} />
          <div>
            <div style={{ fontWeight: 600 }}>{d.title}</div>
            <div className="eyebrow">by {d.owner.displayName} · @{d.owner.handle}</div>
          </div>
        </Link>
      ))}
    </main>
  );
}
