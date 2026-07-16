"use client";

import { useMemo } from "react";
import { EditorContent } from "@tiptap/react";
import { useCollaborativeEditor, type DocumentFormat } from "@writer-platform/editor";

const randomColor = () =>
  `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;

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
  const format = (searchParams.format?.toUpperCase() as DocumentFormat) || "BLOG";

  // In a real app this comes from the authenticated session, not Math.random()
  const user = useMemo(
    () => ({ name: `Guest-${Math.floor(Math.random() * 1000)}`, color: randomColor() }),
    []
  );

  const { editor, status } = useCollaborativeEditor({
    documentId: params.docId,
    format,
    user,
    collabServerUrl: process.env.NEXT_PUBLIC_COLLAB_URL || "ws://localhost:1234",
  });

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <p>
        Format: <strong>{format}</strong> · Collab status: <strong>{status}</strong>
      </p>
      <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: "1rem", minHeight: 400 }}>
        <EditorContent editor={editor} />
      </div>
    </main>
  );
}
