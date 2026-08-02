import { useEffect, useMemo, useState } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
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
  BLOG: [...blogExtensions, Underline],
  ACADEMIC: [...academicExtensions, Underline],
};

interface UseCollaborativeEditorOptions {
  documentId: string;
  format: DocumentFormat;
  user: { name: string; color: string };
  collabServerUrl: string;
}

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
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ history: false }),
      ...formatExtensions[format],
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({ provider, user }),
    ],
  });

  return { editor, status };
}
