import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@writer-platform/db";

async function getAccess(docId: string, userId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: {
      collaborators: { where: { userId }, select: { status: true, role: true } },
    },
  });
  if (!doc) return { doc: null, canView: false, canEdit: false };

  const isOwner = doc.ownerId === userId;
  const collab = doc.collaborators[0];
  const isAcceptedCollaborator = collab?.status === "ACCEPTED";

  return {
    doc,
    canView: isOwner || isAcceptedCollaborator || doc.isPublic,
    canEdit: isOwner || isAcceptedCollaborator,
  };
}

export async function GET(req: Request, { params }: { params: { docId: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const { doc, canView } = await getAccess(params.docId, userId);
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  if (!canView) return NextResponse.json({ error: "You don't have access to this document." }, { status: 403 });

  return NextResponse.json({
    id: doc.id,
    title: doc.title,
    format: doc.format,
    content: doc.content,
    ownerId: doc.ownerId,
    isOwner: doc.ownerId === userId,
  });
}

export async function PATCH(req: Request, { params }: { params: { docId: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const { doc, canEdit } = await getAccess(params.docId, userId);
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  if (!canEdit) return NextResponse.json({ error: "You don't have edit access to this document." }, { status: 403 });

  const { content } = await req.json();
  if (content === undefined) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }

  await prisma.document.update({
    where: { id: params.docId },
    data: { content },
  });

  return NextResponse.json({ ok: true });
}
