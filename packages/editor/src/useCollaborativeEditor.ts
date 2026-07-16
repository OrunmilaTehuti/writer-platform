import { useEffect, useMemo, useState } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

import { screenplayExtensions } from "./formats/screenplay";
import { academicExtensions } from "./formats/academic";
import { blogExtensions } from "./formats/blog";

export type DocumentFormat = "SCREENPLAY" | "BLOG" | "ACADEMIC";

const formatExtensions: Record<DocumentFormat, any[]> = {
  SCREENPLAY: screenplayExtensions,
  BLOG: blogExtensions,
  ACADEMIC: academicExtensions,
};

interface UseCollaborativeEditorOptions {
  documentId: string;
  format: DocumentFormat;
  user: { name: string; color: string };
  /** e.g. ws://localhost:1234 in dev, wss://your-collab-server in prod */
  collabServerUrl: string;
}

/**
 * One hook, three format modes. The Yjs doc + WebSocket provider handle
 * conflict-free multi-user editing; StarterKit + format-specific nodes
 * handle what the content is allowed to look like.
 */
export function useCollaborativeEditor({
  documentId,
  format,
  user,
  collabServerUrl,
}: UseCollaborativeEditorOptions) {
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  const ydoc = useMemo(() => new Y.Doc(), [documentId]);

  const provider = useMemo(
    () => new WebsocketProvider(collabServerUrl, `document-${documentId}`, ydoc),
    [collabServerUrl, documentId, ydoc]
  );

  useEffect(() => {
    provider.on("status", (event: { status: "connecting" | "connected" | "disconnected" }) => {
      setStatus(event.status);
    });
    return () => provider.destroy();
  }, [provider]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }), // Yjs owns undo/redo history
      ...formatExtensions[format],
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user,
      }),
    ],
  });

  return { editor, status };
}
