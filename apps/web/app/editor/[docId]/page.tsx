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

interface FootnoteEntry {
  index: number;
  note: string;
}

// Walks the doc JSON in order and collects footnote nodes, so the
// "Footnotes" list below the editor always matches reading order -
// numbering is derived, never stored, so it can't drift out of sync.
function collectFootnotes(node: any, out: FootnoteEntry[] = []): FootnoteEntry[] {
  if (!node) return out;
  if (node.type === "footnote") {
    out.push({ index: out.length + 1, note: node.attrs?.note || "" });
  }
  (node.content || []).forEach((child: any) => collectFootnotes(child, out));
  return out;
}

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
  const [footnotes, setFootnotes] = useState<FootnoteEntry[]>([]);
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
      if (docMeta.format === "ACADEMIC") {
        setFootnotes(collectFootnotes(editor.getJSON()));
      }
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

    handler(); // populate footnotes list on first load too
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [editor, docId, docMeta.format]);

  async function handleExport() {
    if (!editor) return;
    setExporting(true);
    try {
      const pdfBytes = await exportScreenplayToPdf(editor.getJSON());
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
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

  function insertFootnote() {
    if (!editor) return;
    const note = window.prompt("Footnote text:");
    if (!note) return;
    editor.chain().focus().insertContent({ type: "footnote", attrs: { note } }).run();
  }

  if (sessionStatus === "loading") return <p>Loading...</p>;

  const format = docMeta.format;
  const contentClass =
    format === "SCREENPLAY" ? "screenplay-editor" : format === "ACADEMIC" ? "academic-editor" : "blog-editor";

  return (
    <main style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1.25rem" }}>
      <h2>{docMeta.title}</h2>
      <p>
        Editing as: <strong>{user.name}</strong>{" "}
        {!session?.user && "(guest - log in to save documents to your account)"}
      </p>
      <p className="eyebrow">
        Format: {format} · Collab: {status} · Save: {saveStatus}
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
          {inviteMessage && <span style={{ color: "var(--ink-soft)" }}>{inviteMessage}</span>}
        </form>
      )}

      {/* Screenplay element-type toolbar */}
      {format === "SCREENPLAY" && editor && (
        <div className="format-toolbar">
          {SCREENPLAY_ELEMENTS.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => editor.chain().focus().setNode(type).run()}
              className={editor.isActive(type) ? "is-active" : ""}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Rich-text toolbar for Blog / Academic */}
      {(format === "BLOG" || format === "ACADEMIC") && editor && (
        <div className="format-toolbar">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive("bold") ? "is-active" : ""}>
            <strong>B</strong>
          </button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive("italic") ? "is-active" : ""}>
            <em>I</em>
          </button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive("underline") ? "is-active" : ""}>
            <u>U</u>
          </button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive("heading", { level: 1 }) ? "is-active" : ""}>
            H1
          </button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""}>
            H2
          </button>
          <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive("bulletList") ? "is-active" : ""}>
            • List
          </button>
          <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive("orderedList") ? "is-active" : ""}>
            1. List
          </button>
          <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive("blockquote") ? "is-active" : ""}>
            " Quote
          </button>
          {format === "ACADEMIC" && <button onClick={insertFootnote}>+ Footnote</button>}
        </div>
      )}

      <div className={contentClass} style={{ border: "1px solid var(--rule)", borderRadius: 4, padding: "1.25rem", minHeight: 400 }}>
        <EditorContent editor={editor} />
        {format === "ACADEMIC" && footnotes.length > 0 && (
          <div className="academic-footnotes">
            <strong className="eyebrow">Footnotes</strong>
            <ol>
              {footnotes.map((f) => (
                <li key={f.index}>{f.note}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}
