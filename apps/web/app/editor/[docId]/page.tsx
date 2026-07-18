"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { EditorContent } from "@tiptap/react";
import { useCollaborativeEditor, type DocumentFormat } from "@writer-platform/editor";

const randomColor = () => `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;

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

  if (sessionStatus === "loading") return null;

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <p>
        Editing as: <strong>{user.name}</strong>{" "}
        {!session?.user && "(guest - log in to save documents to your account)"}
      </p>
      <p>
        Format: <strong>{format}</strong> · Collab status: <strong>{status}</strong>
      </p>
      <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: "1rem", minHeight: 400 }}>
        <EditorContent editor={editor} />
      </div>
    </main>
  );
}
