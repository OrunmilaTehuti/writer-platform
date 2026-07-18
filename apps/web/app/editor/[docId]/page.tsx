"use client";

import { useMemo, useState } from "react";
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

/**
 * Demo route: /editor/[docId]?format=SCREENPLAY|BLOG|ACADEMIC
 *
 * Open the same docId in two browser tabs to see real-time collaboration
 * in action. Requires the collab server running: `pnpm collab:server`.
 */
export default function EditorPage({
  params,
  searchParams,
}: {
  params: { docId: string };
  searchParams: { format?: string };
}) {
  const { data: session, status: sessionStatus } = useSession();
  const format = (searchParams.format?.toUpperCase() as DocumentFormat) || "BLOG";
  const [exporting, setExporting] = useState(false);

  // Falls back to a guest identity only if not logged in, so the demo
  // still works for a quick look without requiring sign-up first.
  const user = useMemo(() => {
    if (session?.user) {
      return { name: session.user.name || "Writer", color: randomColor() };
    }
    return { name: `Guest-${Math.floor(Math.random() * 1000)}`, color: randomColor() };
  }, [session]);

  const { editor, status } = useCollaborativeEditor({
    documentId: params.docId,
    format,
    user,
    collabServerUrl: process.env.NEXT_PUBLIC_COLLAB_URL || "ws://localhost:1234",
  });

  async function handleExport() {
    if (!editor) return;
    setExporting(true);
    try {
      const pdfBytes = await exportScreenplayToPdf(editor.getJSON());
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${params.docId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (sessionStatus === "loading") return null;

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <p>
        Editing as: <strong>{user.name}</strong>{" "}
        {!session?.user && "(guest - log in to save documents to your account)"}
      </p>
      <p>
        Format: <strong>{format}</strong> · Collab status: <strong>{status}</strong>
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

      {format === "SCREENPLAY" && editor && (
        <div style={{ marginBottom: "0.5rem", display: "flex", gap: "0.5rem" }}>
          {SCREENPLAY_ELEMENTS.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => editor.chain().focus().setNode(type).run()}
              style={{
                fontWeight: editor.isActive(type) ? "bold" : "normal",
              }}
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
