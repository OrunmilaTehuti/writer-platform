"use client";

import { useEffect, useState } from "react";
import { blogToHtml } from "@writer-platform/editor";

interface DocData {
  title: string;
  format: string;
  content: any;
}

export default function BlogReadPage({ params }: { params: { docId: string } }) {
  const [doc, setDoc] = useState<DocData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/documents/${params.docId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Couldn't load this post.");
          return;
        }
        setDoc(await res.json());
      })
      .catch(() => setError("Couldn't load this post."));
  }, [params.docId]);

  if (error) return <p style={{ color: "var(--accent)", maxWidth: 700, margin: "2rem auto" }}>{error}</p>;
  if (!doc) return <p style={{ maxWidth: 700, margin: "2rem auto" }}>Loading...</p>;

  return (
    <main className="manuscript blog-editor" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
      <h1>{doc.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: blogToHtml(doc.content) }} />
    </main>
  );
}
