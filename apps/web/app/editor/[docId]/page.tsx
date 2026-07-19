"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { EditorContent } from "@tiptap/react";
import {
  useCollaborativeEditor,
  exportScreenplayToPdf,
  type DocumentFormat,
} from "@writer-platform/editor";

const randomColor = () => `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;

const SCREENPLAY_ELEMENTS: { type: string; label: string }[] = [
  { type: "sceneHeading", label: "Scene Heading" },
  { type: "action", label: "Action" },
  { type: "character", label: "Character" },
  { type: "parenthetical", label: "Parenthetical" },
  { type: "dialogue", label: "Dialogue" },
];

interface DocMeta {
  id: string;
  title: string;
  format: DocumentFormat;
  isOwner: boolean;
}

/**
 * Split into an outer loader + inner editor on purpose: the Tiptap editor
 * instance locks in its node schema (which extensions/format it supports)
 * the moment it's created. If it mounted before we knew the document's
 * real format, it would be stuck with the wrong schema (e.g. missing
 * screenplay nodes) for its whole lifetime - which also broke sync with
 * collaborators who *did* have the right schema. So EditorInner only ever
 * mounts once docMeta is already loaded, guaranteeing the correct format
 * from the very first render.
 */
export default function EditorPage({ params }: { params: { docId: string } }) {
  const [docMeta, setDocMeta] = useState<DocMeta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/documents/${params.docId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setLoadError(data.error || "Couldn't load this document.");
          return;
        }
        setDocMeta(await res.json());
      })
      .catch(() => setLoadError("Couldn't load this document."));
  }, [params.docId]);

  if (loadError) return <p style={{ color: "red", maxWidth: 720, margin: "2rem auto" }}>{loadError}</p>;
  if (!docMeta) return <p>Loading...</p>;

  return <EditorInner docId={params.docId} docMeta={docMeta} />;
}

function EditorInner({ docId, docMeta }: { docId: string; docMeta: DocMeta }) {
  const { data: session, status: sessionStatus } = useSession();
  const [exporting, setExporting] = useState(false);
  const [inviteHandle, setInviteHandle] = useState("");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const user = useMemo(() => {
    if (session?.user) return { name: session.user.name || "Writer", color: randomColor() };
    return { name: `Guest-${Math.floor(Math.random() * 1000)}`, color: randomColor() };
  }, [session]);

  const { editor, status } = useCollaborativeEditor({
    documentId: docId,
    format: docMeta.format,
    user,
    collabServerUrl: process.env.NEXT_PUBLIC_COLLAB_URL || "ws://localhost:1234",
  });

  useEffect(() => {
    if (!editor) return;

    const handler = () => {
      setSaveStatus("saving");
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        await fetch(`/api/documents/${docId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editor.getJSON() }),
        });
        setSaveStatus("saved");
      }, 2000);
    };

    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [editor, docId]);

  async function handleExport() {
    if (!editor) return;
    setExporting(true);
    try {
      const pdfBytes = await exportScreenplayToPdf(editor.getJSON());
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${docMeta.title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMessage(null);
    const res = await fetch(`/api/documents/${docId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: inviteHandle }),
    });
    const data = await res.json();
    setInviteMessage(res.ok ? `Invite sent to @${inviteHandle}.` : data.error);
    if (res.ok) setInviteHandle("");
    setInviting(false);
  }

  if (sessionStatus === "loading") return <p>Loading...</p>;

  const format = docMeta.format;

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h2>{docMeta.title}</h2>
      <p>
        Editing as: <strong>{user.name}</strong>{" "}
        {!session?.user && "(guest - log in to save documents to your account)"}
      </p>
      <p>
        Format: <strong>{format}</strong> · Collab status: <strong>{status}</strong> · Save:{" "}
        <strong>{saveStatus}</strong>
        {format === "SCREENPLAY" && (
          <>
            {" "}
            ·{" "}
            <button onClick={handleExport} disabled={exporting}>
              {exporting ? "Exporting..." : "Export PDF"}
            </button>
          </>
        )}
      </p>

      {docMeta.isOwner && (
        <form onSubmit={handleInvite} style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
          <input
            placeholder="Invite collaborator by handle"
            value={inviteHandle}
            onChange={(e) => setInviteHandle(e.target.value)}
          />
          <button type="submit" disabled={inviting || !inviteHandle.trim()}>
            {inviting ? "Inviting..." : "Invite"}
          </button>
          {inviteMessage && <span style={{ color: "#666" }}>{inviteMessage}</span>}
        </form>
      )}

      {format === "SCREENPLAY" && editor && (
        <div style={{ marginBottom: "0.5rem", display: "flex", gap: "0.5rem" }}>
          {SCREENPLAY_ELEMENTS.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => editor.chain().focus().setNode(type).run()}
              style={{ fontWeight: editor.isActive(type) ? "bold" : "normal" }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: "1rem", minHeight: 400 }}>
        <EditorContent editor={editor} />
      </div>
    </main>
  );
}
