"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { EditorContent } from "@tiptap/react";
import {
  useCollaborativeEditor,
  exportScreenplayToPdf,
  exportAcademicToPdf,
  exportAcademicToDocx,
  exportBlogToHtmlFile,
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
  isPublic: boolean;
  references: Source[];
}

interface Source {
  key: string;
  author: string;
  title: string;
  year: string;
}

interface FootnoteEntry {
  index: number;
  note: string;
}

function collectFootnotes(node: any, out: FootnoteEntry[] = []): FootnoteEntry[] {
  if (!node) return out;
  if (node.type === "footnote") {
    out.push({ index: out.length + 1, note: node.attrs?.note || "" });
  }
  (node.content || []).forEach((child: any) => collectFootnotes(child, out));
  return out;
}

// Collects which citation bibKeys actually appear in the doc, in order of
// first appearance - used to only show sources that are really cited.
function collectCitedKeys(node: any, out: string[] = []): string[] {
  if (!node) return out;
  if (node.type === "citation" && node.attrs?.bibKey && !out.includes(node.attrs.bibKey)) {
    out.push(node.attrs.bibKey);
  }
  (node.content || []).forEach((child: any) => collectCitedKeys(child, out));
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
  const [citedKeys, setCitedKeys] = useState<string[]>([]);
  const [sources, setSources] = useState<Source[]>(docMeta.references || []);
  const [isPublic, setIsPublic] = useState(docMeta.isPublic);
  const [publishing, setPublishing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [newSource, setNewSource] = useState({ author: "", title: "", year: "" });
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
        setCitedKeys(collectCitedKeys(editor.getJSON()));
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

    handler();
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [editor, docId, docMeta.format]);

  async function saveSources(next: Source[]) {
    setSources(next);
    await fetch(`/api/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ references: next }),
    });
  }

  function addSource(e: React.FormEvent) {
    e.preventDefault();
    if (!newSource.author.trim() || !newSource.title.trim()) return;
    const key = `${newSource.author.split(" ").pop()?.toLowerCase() || "src"}${newSource.year || ""}`;
    saveSources([...sources, { key, ...newSource }]);
    setNewSource({ author: "", title: "", year: "" });
  }

  function removeSource(key: string) {
    saveSources(sources.filter((s) => s.key !== key));
  }

  function insertCitation(source: Source) {
    if (!editor) return;
    const label = `(${source.author.split(" ").pop() || "?"}, ${source.year || "n.d."})`;
    editor.chain().focus().insertContent({ type: "citation", attrs: { bibKey: source.key, label } }).run();
  }

  async function handleScreenplayExport() {
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

  function download(blobPart: BlobPart, mime: string, filename: string) {
    const blob = new Blob([blobPart], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleBlogExport() {
    if (!editor) return;
    const html = exportBlogToHtmlFile(editor.getJSON(), docMeta.title);
    download(html, "text/html", `${docMeta.title}.html`);
  }

  async function togglePublish() {
    setPublishing(true);
    const next = !isPublic;
    const res = await fetch(`/api/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: next }),
    });
    if (res.ok) setIsPublic(next);
    setPublishing(false);
  }

  async function shareToFeed() {
    if (!isPublic) {
      window.alert("Publish this post first, then you can share it to your feed.");
      return;
    }
    const caption = window.prompt(`Say something about "${docMeta.title}" for your feed post:`, `Just published: ${docMeta.title}`);
    if (!caption) return;
    setSharing(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: caption, documentId: docId }),
    });
    setSharing(false);
    if (res.ok) window.alert("Shared to your feed!");
    else window.alert("Couldn't share this post - try again.");
  }

  async function handleAcademicExport(kind: "pdf" | "docx") {
    if (!editor) return;
    setExporting(true);
    try {
      if (kind === "pdf") {
        const pdfBytes = await exportAcademicToPdf(editor.getJSON(), docMeta.title, sources);
        download(pdfBytes as BlobPart, "application/pdf", `${docMeta.title}.pdf`);
      } else {
        const blob = await exportAcademicToDocx(editor.getJSON(), docMeta.title, sources);
        download(blob, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", `${docMeta.title}.docx`);
      }
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

  const citedSources = sources.filter((s) => citedKeys.includes(s.key));

  return (
    <main style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1.25rem" }}>
      <h2>{docMeta.title}</h2>
      <p>
        Editing as: <strong>{user.name}</strong>{" "}
        {!session?.user && "(guest - log in to save documents to your account)"}
      </p>
      <p className="eyebrow">
        Format: {format} · Collab: {status} · Save: {saveStatus}
        {format === "BLOG" && isPublic && <> · <span style={{ color: "var(--accent)" }}>Published</span></>}
        {format === "SCREENPLAY" && (
          <>
            {" "}
            ·{" "}
            <button onClick={handleScreenplayExport} disabled={exporting}>
              {exporting ? "Exporting..." : "Export PDF"}
            </button>
          </>
        )}
        {format === "ACADEMIC" && (
          <>
            {" "}
            ·{" "}
            <button onClick={() => handleAcademicExport("pdf")} disabled={exporting}>
              {exporting ? "Exporting..." : "Export PDF"}
            </button>{" "}
            <button onClick={() => handleAcademicExport("docx")} disabled={exporting}>
              {exporting ? "Exporting..." : "Export Word"}
            </button>
          </>
        )}
        {format === "BLOG" && (
          <>
            {" "}
            ·{" "}
            <button onClick={handleBlogExport}>Export HTML</button>{" "}
            {docMeta.isOwner && (
              <>
                <button onClick={togglePublish} disabled={publishing}>
                  {publishing ? "..." : isPublic ? "Unpublish" : "Publish"}
                </button>{" "}
                <button onClick={shareToFeed} disabled={sharing || !isPublic}>
                  {sharing ? "Sharing..." : "Share to Feed"}
                </button>
              </>
            )}
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
          {format === "ACADEMIC" && (
            <>
              <button onClick={insertFootnote}>+ Footnote</button>
              <button onClick={() => setShowReferences((s) => !s)}>
                {showReferences ? "Hide References" : "References"}
              </button>
            </>
          )}
        </div>
      )}

      {format === "ACADEMIC" && showReferences && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
          <h3 className="eyebrow">Sources</h3>
          {sources.map((s) => (
            <div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "0.9rem" }}>
                {s.author} ({s.year || "n.d."}) — <em>{s.title}</em>
              </span>
              <span>
                <button onClick={() => insertCitation(s)} style={{ marginRight: "0.4rem" }}>
                  Cite
                </button>
                <button onClick={() => removeSource(s.key)}>Remove</button>
              </span>
            </div>
          ))}
          <form onSubmit={addSource} style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <input
              placeholder="Author"
              value={newSource.author}
              onChange={(e) => setNewSource({ ...newSource, author: e.target.value })}
            />
            <input
              placeholder="Title"
              value={newSource.title}
              onChange={(e) => setNewSource({ ...newSource, title: e.target.value })}
            />
            <input
              placeholder="Year"
              value={newSource.year}
              onChange={(e) => setNewSource({ ...newSource, year: e.target.value })}
              style={{ width: "5rem" }}
            />
            <button type="submit">Add source</button>
          </form>
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
        {format === "ACADEMIC" && citedSources.length > 0 && (
          <div className="academic-footnotes">
            <strong className="eyebrow">References</strong>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {citedSources.map((s) => (
                <li key={s.key} style={{ marginBottom: "0.3rem" }}>
                  {s.author} ({s.year || "n.d."}). <em>{s.title}</em>.
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
